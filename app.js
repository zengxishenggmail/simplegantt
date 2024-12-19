// NOTE: When displaying, creating, or updating items, always handle missing properties gracefully.
// This ensures backward compatibility with files created in previous versions of the app.

let projectData = { projectName: 'Untitled Project', categories: [], tasks: [], people: [] };
const CATEGORY_HEADING_HEIGHT = 30; // Adjust as needed
let fileHandle;

const projectNameDisplay = document.getElementById('projectNameDisplay');
const projectNameInput = document.getElementById('projectNameInput');
const editProjectNameButton = document.getElementById('editProjectNameButton');

function updateProjectNameDisplay() {
    projectNameDisplay.textContent = projectData.projectName || 'Untitled Project';
    projectNameInput.value = projectData.projectName || 'Untitled Project';
}

// When the edit button is clicked
editProjectNameButton.addEventListener('click', () => {
    projectNameDisplay.style.display = 'none';
    projectNameInput.style.display = 'inline-block';
    projectNameInput.focus();
});

// When the user finishes editing (input loses focus)
projectNameInput.addEventListener('blur', () => {
    projectData.projectName = projectNameInput.value.trim() || 'Untitled Project';
    projectNameDisplay.style.display = 'inline';
    projectNameInput.style.display = 'none';
    updateProjectNameDisplay();
    // Optionally save the project data to persist the name change
    saveProjectData(projectData, true);
});

// Optional: Allow pressing Enter to finish editing
projectNameInput.addEventListener('keyup', (event) => {
    if (event.key === 'Enter') {
        projectNameInput.blur();
    }
});

let pixelsPerDay = 30; // For horizontal zoom
let taskHeight = 30;   // For vertical zoom
let taskSpacing = 5;
const GANTT_CHART_PADDING_TOP = 60; // This should match the padding-top in styles.css


function computeTaskStartDate(index, taskStartDates, projectData, visited = {}) {
    if (taskStartDates[index]) {
        return taskStartDates[index];
    }

    if (visited[index]) {
        throw new Error('Circular dependency detected in tasks.');
    }
    visited[index] = true;

    const task = projectData.tasks[index];

    // Ensure `task.start` exists and is valid
    let taskStartDate;
    if (task.start) {
        taskStartDate = new Date(task.start + 'T00:00:00Z');
        if (isNaN(taskStartDate.getTime())) {
            // Invalid date, set to default
            taskStartDate = new Date('1970-01-01T00:00:00Z');
        }
    } else {
        // Default start date if missing
        taskStartDate = new Date('1970-01-01T00:00:00Z');
    }

    if (task.dependencies && task.dependencies.length > 0) {
        const latestDependencyEnd = task.dependencies.reduce((latestDate, depIndex) => {
            const depStartDate = computeTaskStartDate(depIndex, taskStartDates, projectData, visited);
            const depTask = projectData.tasks[depIndex];
            const depEndDate = new Date(depStartDate.getTime() + depTask.duration * 24 * 60 * 60 * 1000);
            return depEndDate > latestDate ? depEndDate : latestDate;
        }, new Date(0));

        if (latestDependencyEnd > taskStartDate) {
            taskStartDate = latestDependencyEnd;
        }
    }

    taskStartDates[index] = taskStartDate;
    delete visited[index];
    return taskStartDate;
}

document.getElementById('loadProject').addEventListener('click', async function() {
    if ('showOpenFilePicker' in window) {
        try {
            const [handle] = await window.showOpenFilePicker({
                types: [{
                    description: 'YAML Files',
                    accept: {'text/yaml': ['.yaml', '.yml']},
                }],
                multiple: false,
            });
            fileHandle = handle;

            const file = await fileHandle.getFile();
            const yamlText = await file.text();
            console.log('Raw YAML content:', yamlText);

            try {
                projectData = jsyaml.load(yamlText);

                // Initialize `projectName` if it's undefined or empty
                if (!projectData.projectName || projectData.projectName.trim() === '') {
                    projectData.projectName = 'Untitled Project';
                }

                // Initialize tasks array if it's not an array
                if (!Array.isArray(projectData.tasks)) {
                    projectData.tasks = [];
                    console.warn('Project data did not contain tasks array. Initialized as empty.');
                }

                // Initialize properties for each task
                projectData.tasks.forEach(task => {
                    if (!Array.isArray(task.dependencies)) {
                        task.dependencies = [];
                    }
                    // Initialize missing task properties for backward compatibility
                    if (!task.name) {
                        task.name = 'Untitled Task';
                    }
                    if (!task.start) {
                        task.start = '1970-01-01'; // Default start date
                    }
                    if (!task.duration || isNaN(parseInt(task.duration, 10))) {
                        task.duration = 1; // Default duration
                    }
                    if (!task.categoryId) {
                        task.categoryId = null;
                    }
                    if (!task.description) {
                        task.description = '';
                    }
                    if (!task.status) {
                        task.status = 'on-track';
                    }
                    if (!task.statusExplanation) {
                        task.statusExplanation = '';
                    }
                    if (!Array.isArray(task.assignedPeople)) {
                        task.assignedPeople = [];
                    }
                });
            } catch (parseError) {
                console.error('YAML Parsing Error:', parseError);
                throw new Error('Failed to parse YAML: ' + parseError.message);
            }

            // Initialize `categories` if it's undefined
            if (!Array.isArray(projectData.categories)) {
                projectData.categories = [];
            }

            // Initialize `people` if it's undefined
            if (!Array.isArray(projectData.people)) {
                projectData.people = [];
            }

            console.log('Loaded projectData:', projectData);

            if (!projectData || typeof projectData !== 'object') {
                throw new Error('Invalid project data: not an object');
            }

            if (!Array.isArray(projectData.tasks)) {
                projectData.tasks = [];
                console.warn('Project data did not contain tasks array. Initialized as empty.');
            }

            // Initialize dependencies as an array for all tasks
            projectData.tasks.forEach(task => {
                if (!Array.isArray(task.dependencies)) {
                    task.dependencies = [];
                }
            });

            // Use filename as project name only if projectName is missing or empty
            if (!projectData.projectName || projectData.projectName.trim() === '') {
                projectData.projectName = fileHandle.name.replace(/\.[^/.]+$/, ""); // Remove file extension
            }

            updateProjectNameDisplay();
            updateDependenciesOptions();
            renderGanttChart(projectData);
            updateCategoryOptions();
            renderCategoriesList();

            // Save project data and file name to localStorage
            localStorage.setItem('projectData', JSON.stringify(projectData));
            localStorage.setItem('fileName', fileHandle.name);
        } catch (error) {
            alert('Failed to load project: ' + error.message);
            console.error('Error loading project:', error);
        }
    } else {
        alert('Your browser does not support the File System Access API.');
    }
});

document.getElementById('newProject').addEventListener('click', async function() {
    projectData = { projectName: 'Untitled Project', tasks: [], categories: [], people: [] };
    fileHandle = null; // Reset the fileHandle
    updateProjectNameDisplay();
    renderGanttChart(projectData);
    updateDependenciesOptions();

    // Clear localStorage when creating a new project
    localStorage.removeItem('projectData');
    localStorage.removeItem('fileName');
});

document.getElementById('saveProject').addEventListener('click', async function() {
    await saveProjectData(projectData, false);
});

document.getElementById('saveAsProject').addEventListener('click', async function() {
    fileHandle = null;
    await saveProjectData(projectData, false);
});

document.getElementById('addTaskForm').addEventListener('submit', async function(event) {
    event.preventDefault();
    const submitButton = event.target.querySelector('button[type="submit"]');
    const editIndex = submitButton.getAttribute('data-edit-index');
    const formErrorMessage = document.getElementById('formErrorMessage');

    // Collect form inputs
    const taskName = document.getElementById('taskName').value.trim();
    const taskStart = document.getElementById('taskStart').value;
    const taskDurationValue = document.getElementById('taskDuration').value;

    // Validate task start date
    if (!taskStart) {
        formErrorMessage.textContent = 'Please enter a valid start date for the task.';
        return;
    }

    // Validate task duration
    const taskDuration = parseInt(taskDurationValue, 10);
    if (isNaN(taskDuration) || taskDuration < 1) {
        formErrorMessage.textContent = 'Please enter a valid duration (number greater than 0) for the task.';
        return;
    }

    // Clear the error message when validation passes
    formErrorMessage.textContent = '';

    // Collect task description
    const taskDescription = document.getElementById('taskDescription').value.trim();

    // Collect dependencies
    const dependenciesSelect = document.getElementById('taskDependencies');
    let dependencies = Array.from(dependenciesSelect.selectedOptions)
        .map(option => parseInt(option.value));

    // If editing, remove self-dependency just in case
    if (editIndex !== null) {
        const currentIndex = parseInt(editIndex, 10);
        dependencies = dependencies.filter(depIndex => depIndex !== currentIndex);
    }

    // Collect selected category
    const categorySelect = document.getElementById('taskCategory');
    const categoryId = parseInt(categorySelect.value, 10);

    const taskStatus = document.getElementById('taskStatus').value || 'on-track';
    const statusExplanation = document.getElementById('statusExplanation').value.trim();

    // Collect assigned people
    const assignedPeopleSelect = document.getElementById('taskPeople');
    const assignedPeople = Array.from(assignedPeopleSelect.selectedOptions)
        .map(option => parseInt(option.value));

    const task = {
        name: taskName,
        start: taskStart,
        duration: taskDuration,
        dependencies: dependencies || [],
        categoryId: categoryId || null,
        description: taskDescription || '',
        status: taskStatus || 'on-track',
        statusExplanation: statusExplanation || '',
        assignedPeople: assignedPeople || []
    };

    if (editIndex !== null) {
        projectData.tasks[parseInt(editIndex, 10)] = task;
        submitButton.textContent = 'Add Task';
        submitButton.removeAttribute('data-edit-index');
    } else {
        projectData.tasks.push(task);
    }

    renderGanttChart(projectData);
    updateDependenciesOptions();
    
    try {
        await saveProjectData(projectData, true);
    } catch (error) {
        console.error('Error during save:', error);
        const statusMessage = document.getElementById('statusMessage');
        statusMessage.textContent = 'Error saving project.';
        statusMessage.style.color = 'red';
    }
    
    event.target.reset();
    taskModal.style.display = 'none';
    choices.removeActiveItems();
});

function renderTimeScale(projectStartDate, projectEndDate) {
    projectStartDate = new Date(projectStartDate.toISOString().split('T')[0] + 'T00:00:00Z');
    projectEndDate = new Date(projectEndDate.toISOString().split('T')[0] + 'T00:00:00Z');

    const timeScale = document.createElement('div');
    timeScale.classList.add('time-scale');

    const days = (projectEndDate - projectStartDate) / (1000 * 60 * 60 * 24);
    for (let i = 0; i <= days; i++) {
        const date = new Date(projectStartDate.getTime() + i * 24 * 60 * 60 * 1000);

        // Create vertical grid lines
        const daySeparator = document.createElement('div');
        daySeparator.classList.add('day-separator');
        daySeparator.style.left = `${i * pixelsPerDay}px`;
        timeScale.appendChild(daySeparator);

        // Add date labels at intervals
        if (i % 7 === 0 || i === 0 || i === days) {
            const dateLabel = document.createElement('div');
            dateLabel.classList.add('date-label');
            dateLabel.style.left = `${i * pixelsPerDay}px`;
            dateLabel.textContent = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
            timeScale.appendChild(dateLabel);
        }
    }

    return timeScale;
}

function renderGanttChart(projectData) {
    if (!projectData || !Array.isArray(projectData.tasks)) {
        console.error('Invalid project data provided to renderGanttChart.');
        return;
    }

    const ganttChart = document.getElementById('ganttChart');
    ganttChart.innerHTML = '';

    if (projectData.tasks.length === 0) return;

    const taskStartDates = {};
    projectData.tasks.forEach((task, index) => {
        computeTaskStartDate(index, taskStartDates, projectData);
    });

    const startDates = Object.values(taskStartDates).map(date => date);
    const endDates = projectData.tasks.map((task, index) => {
        const startDate = taskStartDates[index];
        return new Date(startDate.getTime() + task.duration * 24 * 60 * 60 * 1000);
    });

    const projectStartDate = new Date(Math.min(...startDates));
    const projectEndDate = new Date(Math.max(...endDates));

    const timeScale = renderTimeScale(projectStartDate, projectEndDate);
    ganttChart.appendChild(timeScale);

    const fragment = document.createDocumentFragment();
    let currentTop = GANTT_CHART_PADDING_TOP; // For positioning tasks

    // Group tasks by categories
    const tasksByCategory = {};
    projectData.tasks.forEach((task, index) => {
        const categoryId = task.categoryId || 'uncategorized';
        if (!tasksByCategory[categoryId]) {
            tasksByCategory[categoryId] = [];
        }
        tasksByCategory[categoryId].push({ task, index });
    });

    // Render tasks grouped by categories
    for (const categoryId in tasksByCategory) {
        const categoryTasks = tasksByCategory[categoryId];
        let category;

        if (categoryId !== 'uncategorized') {
            category = projectData.categories.find(cat => cat.id === parseInt(categoryId, 10));
        }

        // Render category headline
        const categoryElement = document.createElement('div');
        categoryElement.classList.add('category-heading');
        categoryElement.style.top = `${currentTop}px`;
        categoryElement.textContent = category ? category.name : 'Uncategorized';
        categoryElement.style.borderLeftColor = category ? category.color : '#999';
        fragment.appendChild(categoryElement);
        currentTop += taskHeight + 10; // Adjust category heading height

        // Render tasks within this category
        categoryTasks.forEach(({ task, index }) => {
            const taskElement = document.createElement('div');
            taskElement.classList.add('task-bar');

            // Use default values for missing properties
            const taskName = task.name || 'Untitled Task';
            const taskDuration = task.duration || 1; // Default duration of 1 day

            taskElement.style.width = `${taskDuration * pixelsPerDay}px`;
            taskElement.style.height = `${taskHeight}px`;

            // Ensure `taskStartDate` is valid
            const taskStartDate = taskStartDates[index];
            if (!taskStartDate || isNaN(taskStartDate.getTime())) {
                // Set to default date if invalid
                taskStartDate = new Date('1970-01-01T00:00:00Z');
            }

            const daysFromStart = (taskStartDate - projectStartDate) / (1000 * 60 * 60 * 24);

            taskElement.style.left = `${daysFromStart * pixelsPerDay}px`;
            taskElement.style.top = `${currentTop}px`;

            // Set task color based on category
            taskElement.style.backgroundColor = category ? category.color : '#999';

            const tooltipContent = `
                Name: ${taskName}
                Start: ${taskStartDate.toISOString().split('T')[0]}
                Duration: ${taskDuration} days
                Dependencies: ${(task.dependencies || []).map(depIndex => projectData.tasks[depIndex]?.name).join(', ') || 'None'}
            `;

            taskElement.setAttribute('data-tooltip', tooltipContent);

            const taskEndDate = new Date(taskStartDate.getTime() + taskDuration * 24 * 60 * 60 * 1000);

            let displayStatus = task.status || 'on-track';
            const currentDate = new Date();

            // If current date is past the task's end date and task is not scrapped or finished
            if (currentDate > taskEndDate && displayStatus !== 'scrapped' && displayStatus !== 'finished') {
                displayStatus = 'high risk';
            }

            let statusIndicatorHTML;

            if (displayStatus === 'finished') {
                statusIndicatorHTML = `<div class="status-indicator ${getStatusClass(displayStatus)}">🎉</div>`;
            } else {
                statusIndicatorHTML = `<div class="status-indicator ${getStatusClass(displayStatus)}"></div>`;
            }

            // Get the first assignee's name, if any
            let firstAssigneeName = '';
            if (Array.isArray(task.assignedPeople) && task.assignedPeople.length > 0) {
                const firstPersonId = task.assignedPeople[0];
                const firstPerson = projectData.people.find(p => p.id === firstPersonId);
                if (firstPerson) {
                    firstAssigneeName = firstPerson.name;
                }
            }

            // Modify taskElement based on assignment
            let assignmentDisplay = '';
            if (!firstAssigneeName) {
                // Task is unassigned
                taskElement.style.border = '2px solid red';
                assignmentDisplay = ' ❓';
            } else {
                // Task has an assignee, display the name
                assignmentDisplay = `<span class="assignee-name">${firstAssigneeName}</span>`;
            }

            taskElement.innerHTML = `
                ${statusIndicatorHTML}
                <span class="task-name">${taskName}${assignmentDisplay}</span>
                <div class="task-buttons">
                    <button class="edit-task" data-index="${index}"><i class="fas fa-edit"></i></button>
                    <button class="delete-task" data-index="${index}"><i class="fas fa-trash-alt"></i></button>
                </div>
            `;
            taskElement.setAttribute('role', 'button');
            taskElement.setAttribute('tabindex', '0');
            taskElement.setAttribute('aria-label', `Task: ${task.name}`);
            taskElement.setAttribute('data-index', index);

            fragment.appendChild(taskElement);
            currentTop += taskHeight + taskSpacing;
        });
    }

    ganttChart.appendChild(fragment);

    // Update chart height
    ganttChart.style.height = `${currentTop}px`;
}

document.getElementById('ganttChart').addEventListener('click', function(event) {
    const editButton = event.target.closest('.edit-task');
    const deleteButton = event.target.closest('.delete-task');
    const taskBar = event.target.closest('.task-bar');

    if (editButton) {
        editTask(editButton);
    } else if (deleteButton) {
        deleteTask(deleteButton);
    } else if (taskBar) {
        // Open the task details modal
        const taskIndex = parseInt(taskBar.getAttribute('data-index'), 10);
        showTaskDetails(taskIndex);
    }
});

function showTaskDetails(taskIndex) {
    const task = projectData.tasks[taskIndex];
    document.getElementById('detailTaskName').textContent = task.name || 'Untitled Task';
    document.getElementById('detailTaskStart').textContent = task.start || 'Unknown Start Date';
    document.getElementById('detailTaskDuration').textContent = task.duration || 1;
    document.getElementById('detailTaskDependencies').textContent = (task.dependencies || [])
        .map(depIndex => projectData.tasks[depIndex]?.name)
        .join(', ') || 'None';

    // Handle missing description
    const rawDescription = marked.parse(task.description || 'No description.');
    const sanitizedDescription = DOMPurify.sanitize(rawDescription);
    document.getElementById('detailTaskDescription').innerHTML = sanitizedDescription;

    // Handle missing status
    document.getElementById('detailTaskStatus').textContent = task.status || 'on-track';

    // Handle missing status explanation
    const rawStatusExplanation = marked.parse(task.statusExplanation || 'No status explanation.');
    const sanitizedStatusExplanation = DOMPurify.sanitize(rawStatusExplanation);
    document.getElementById('detailStatusExplanation').innerHTML = sanitizedStatusExplanation;

    // Display assigned people
    document.getElementById('detailAssignedPeople').textContent = (task.assignedPeople || [])
        .map(personId => projectData.people.find(p => p.id === personId)?.name)
        .join(', ') || 'None';

    // Show the modal
    const taskDetailsModal = document.getElementById('taskDetailsModal');
    taskDetailsModal.style.display = 'block';
}

// Add event listener to close the task details modal
const taskDetailsModal = document.getElementById('taskDetailsModal');
const closeTaskDetailsModalButton = taskDetailsModal.querySelector('.close-button');
closeTaskDetailsModalButton.addEventListener('click', () => {
    taskDetailsModal.style.display = 'none';
});

// Close the modal when clicking outside of it
window.addEventListener('click', (event) => {
    if (event.target === taskDetailsModal) {
        taskDetailsModal.style.display = 'none';
    }
});

function editTask(buttonElement) {
    const taskIndex = parseInt(buttonElement.getAttribute('data-index'), 10);
    const task = projectData.tasks[taskIndex];

    // Ensure dependencies is an array
    if (!Array.isArray(task.dependencies)) {
        task.dependencies = [];
    }

    updateDependenciesOptions(taskIndex);
    updateCategoryOptions();
    updatePeopleOptions();

    // Ensure defaults for missing properties
    document.getElementById('taskName').value = task.name || '';
    document.getElementById('taskStart').value = task.start || '';
    document.getElementById('taskDuration').value = task.duration || 1;
    document.getElementById('taskDescription').value = task.description || '';
    document.getElementById('taskStatus').value = task.status || 'on-track';
    document.getElementById('statusExplanation').value = task.statusExplanation || '';

    // Pre-select dependencies
    choices.setChoiceByValue((task.dependencies || []).map(String));

    // Pre-select assigned people
    peopleChoices.setChoiceByValue((task.assignedPeople || []).map(String));

    // Set the selected category
    const categorySelect = document.getElementById('taskCategory');
    categorySelect.value = task.categoryId || '';

    const submitButton = document.querySelector('#addTaskForm button[type="submit"]');
    submitButton.textContent = 'Update Task';
    submitButton.setAttribute('data-edit-index', taskIndex);

    modalTitle.textContent = 'Edit Task';
    taskModal.style.display = 'block';
}

async function deleteTask(buttonElement) {
    const taskIndex = buttonElement.getAttribute('data-index');
    const taskName = projectData.tasks[taskIndex].name;

    const confirmDelete = confirm(`Are you sure you want to delete the task "${taskName}"?`);
    if (!confirmDelete) return;

    projectData.tasks.splice(taskIndex, 1);
    renderGanttChart(projectData);
    updateDependenciesOptions();
    
    await saveProjectData(projectData, true);
}

let choices;
let peopleChoices;

document.addEventListener('DOMContentLoaded', () => {
    choices = new Choices('#taskDependencies', {
        removeItemButton: true,
        shouldSort: false,
        searchResultLimit: 10,
        placeholderValue: 'Select dependencies...',
    });

    peopleChoices = new Choices('#taskPeople', {
        removeItemButton: true,
        shouldSort: false,
        searchResultLimit: 10,
        placeholderValue: 'Assign people...',
    });

    // Get references to the zoom controls
    const horizontalZoomInput = document.getElementById('horizontalZoom');
    const verticalZoomInput = document.getElementById('verticalZoom');
    const horizontalZoomValue = document.getElementById('horizontalZoomValue');
    const verticalZoomValue = document.getElementById('verticalZoomValue');

    // Update the values on page load
    horizontalZoomValue.textContent = pixelsPerDay;
    verticalZoomValue.textContent = taskHeight;

    // Debounce function
    function debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    // Event listener for horizontal zoom
    horizontalZoomInput.addEventListener('input', debounce(() => {
        pixelsPerDay = parseInt(horizontalZoomInput.value, 10);
        horizontalZoomValue.textContent = pixelsPerDay;
        renderGanttChart(projectData);
    }, 100));

    // Event listener for vertical zoom
    verticalZoomInput.addEventListener('input', debounce(() => {
        taskHeight = parseInt(verticalZoomInput.value, 10);
        verticalZoomValue.textContent = taskHeight;
        taskSpacing = Math.round(taskHeight / 6);
        renderGanttChart(projectData);
    }, 100));

    // Tab functionality for categories modal
    const tabButtons = categoriesModal.querySelectorAll('.tab-button');
    const tabContents = categoriesModal.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.getAttribute('data-tab');

            // Deactivate all tabs and contents
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            // Activate selected tab and content
            button.classList.add('active');
            categoriesModal.querySelector(`#${targetTab}Tab`).classList.add('active');
        });
    });

    // Initialize Spectrum color picker
    $("#categoryColor").spectrum({
        preferredFormat: "hex",
        showInput: true,
        showPalette: true,
        palette: [
            ["#4CAF50", "#FF9800", "#2196F3", "#9C27B0", "#F44336", "#FFC107"],
            ["#E91E63", "#00BCD4", "#8BC34A", "#CDDC39", "#FFC107", "#FF5722"],
            ["#795548", "#9E9E9E", "#607D8B", "#000000", "#FFFFFF"]
        ]
    });

    // Attach event listener to the addCategoryForm
    document.getElementById('addCategoryForm').addEventListener('submit', function(event) {
        event.preventDefault();
        const categoryNameInput = document.getElementById('categoryName');
        const categoryName = categoryNameInput.value.trim();

        if (!categoryName) {
            // Display an error message or highlight the input
            categoryNameInput.focus();
            return;
        }

        const categoryColor = document.getElementById('categoryColor').value;
        const editId = event.target.getAttribute('data-edit-id');

        if (editId) {
            // Update existing category
            const category = projectData.categories.find(cat => cat.id === parseInt(editId, 10));
            if (category) {
                category.name = categoryName;
                category.color = categoryColor;
            }
            // Reset form
            event.target.removeAttribute('data-edit-id');
            document.querySelector('#addCategoryForm button[type="submit"]').textContent = 'Add Category';
        } else {
            // Add new category
            const category = {
                id: Date.now(),
                name: categoryName,
                color: categoryColor
            };
            projectData.categories.push(category);
        }

        // Update UI and save data
        renderCategoriesList();
        updateCategoryOptions();
        renderGanttChart(projectData);
        saveProjectData(projectData, true);

        // Reset the form
        event.target.reset();
    });

    // Attach event listener to the manage categories button
    manageCategoriesButton.addEventListener('click', () => {
        categoriesModal.style.display = 'block';
        renderCategoriesList();
    });

    // Attach event listener to the close button of the categories modal
    closeCategoriesModalButton.addEventListener('click', () => {
        categoriesModal.style.display = 'none';
        document.getElementById('addCategoryForm').reset();
    });

    // Now render the chart and update dependencies options
    renderGanttChart(projectData);
    updateDependenciesOptions();
});

function updateDependenciesOptions(excludeIndex = null) {
    const choicesList = projectData.tasks
        .map((task, index) => {
            if (index !== excludeIndex) {
                return { value: index.toString(), label: task.name };
            }
            return null;
        })
        .filter(item => item !== null);

    choices.clearChoices();
    choices.setChoices(choicesList, 'value', 'label', false);
}

async function saveProjectData(projectData, autosave = false) {
    const statusMessage = document.getElementById('statusMessage');
    statusMessage.textContent = 'Saving...';

    if ('showSaveFilePicker' in window) {
        if (!fileHandle) {
            if (autosave) {
                // Autosave to localStorage when fileHandle is not available
                localStorage.setItem('projectData', JSON.stringify(projectData));
                statusMessage.textContent = 'Autosaved to local storage.';
                setTimeout(() => {
                    statusMessage.textContent = '';
                }, 5000);
                return;
            } else {
                // Prompt the user to pick a file to save
                try {
                    fileHandle = await window.showSaveFilePicker({
                        suggestedName: 'project.yaml',
                        types: [{
                            description: 'YAML Files',
                            accept: {'text/yaml': ['.yaml', '.yml']},
                        }],
                    });
                } catch (err) {
                    console.error('Save cancelled:', err);
                    statusMessage.textContent = 'Save cancelled.';
                    return;
                }
            }
        }

        if (fileHandle) {
            try {
                const writable = await fileHandle.createWritable();
                await writable.write(jsyaml.dump(projectData));
                await writable.close();
                statusMessage.textContent = autosave ? 'Autosaved.' : 'Project saved successfully.';
                statusMessage.style.color = 'green';
            } catch (err) {
                console.error('Error during save:', err);
                statusMessage.textContent = 'Error saving project.';
                statusMessage.style.color = 'red';
            }
        }

        // Update localStorage with the latest project data
        localStorage.setItem('projectData', JSON.stringify(projectData));
        if (fileHandle && fileHandle.name) {
            localStorage.setItem('fileName', fileHandle.name);
        }
    } else {
        // Fallback for browsers that do not support the File System Access API
        const yamlData = jsyaml.dump(projectData);
        const blob = new Blob([yamlData], {type: 'text/yaml'});
        if (!autosave) {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'project.yaml';
            link.click();
            URL.revokeObjectURL(url);
            statusMessage.textContent = 'Project saved successfully (fallback method).';
        } else {
            console.warn('Autosave skipped: unsupported in this browser.');
            statusMessage.textContent = 'Autosave not supported in this browser.';
        }
    }

    setTimeout(() => {
        statusMessage.textContent = '';
        statusMessage.style.color = '';
    }, 5000);
}

const taskModal = document.getElementById('taskModal');
const openTaskModalButton = document.getElementById('openTaskModal');
const closeModalButton = taskModal.querySelector('.close-button');
const modalTitle = document.getElementById('modalTitle');

// Get references to the manage categories button and modal
const manageCategoriesButton = document.getElementById('manageCategoriesButton');
const categoriesModal = document.getElementById('categoriesModal');
const closeCategoriesModalButton = categoriesModal.querySelector('.close-button');

// Get references to the manage people button and modal
const managePeopleButton = document.getElementById('managePeopleButton');
const peopleModal = document.getElementById('peopleModal');
const closePeopleModalButton = peopleModal.querySelector('.close-button');

// Open the categories modal when the button is clicked
manageCategoriesButton.addEventListener('click', () => {
    categoriesModal.style.display = 'block';
    renderCategoriesList();
});

// Close the modal when the close button is clicked
closeCategoriesModalButton.addEventListener('click', () => {
    categoriesModal.style.display = 'none';
    document.getElementById('addCategoryForm').reset();
});

// Close the modal when clicking outside of it
window.addEventListener('click', (event) => {
    if (event.target === categoriesModal) {
        categoriesModal.style.display = 'none';
        document.getElementById('addCategoryForm').reset();
    }
});

// Open the people modal when the button is clicked
managePeopleButton.addEventListener('click', () => {
    peopleModal.style.display = 'block';
    renderPeopleList();
});

// Close the people modal when the close button is clicked
closePeopleModalButton.addEventListener('click', () => {
    peopleModal.style.display = 'none';
    document.getElementById('addPersonForm').reset();
});

// Close the people modal when clicking outside of it
window.addEventListener('click', (event) => {
    if (event.target === peopleModal) {
        peopleModal.style.display = 'none';
        document.getElementById('addPersonForm').reset();
    }
});

// Tab functionality for people modal
const peopleTabButtons = peopleModal.querySelectorAll('.tab-button');
const peopleTabContents = peopleModal.querySelectorAll('.tab-content');

peopleTabButtons.forEach(button => {
    button.addEventListener('click', () => {
        const targetTab = button.getAttribute('data-tab');

        // Deactivate all tabs and contents
        peopleTabButtons.forEach(btn => btn.classList.remove('active'));
        peopleTabContents.forEach(content => content.classList.remove('active'));

        // Activate selected tab and content
        button.classList.add('active');
        peopleModal.querySelector(`#${targetTab}Tab`).classList.add('active');
    });
});

// This event listener is now moved inside the DOMContentLoaded event

function renderCategoriesList() {
    const categoriesList = document.getElementById('categoriesList');
    categoriesList.innerHTML = '';

    projectData.categories.forEach((category) => {
        const categoryItem = document.createElement('div');
        categoryItem.classList.add('category-item');

        const colorIndicator = document.createElement('div');
        colorIndicator.classList.add('color-indicator');
        colorIndicator.style.backgroundColor = category.color;

        const categoryName = document.createElement('span');
        categoryName.textContent = category.name || 'Unnamed Category';

        const editButton = document.createElement('button');
        editButton.innerHTML = '<i class="fas fa-edit"></i>';
        editButton.addEventListener('click', () => {
            editCategory(category.id);
        });

        const deleteButton = document.createElement('button');
        deleteButton.innerHTML = '<i class="fas fa-trash-alt"></i>';
        deleteButton.addEventListener('click', () => {
            deleteCategory(category.id);
        });

        categoryItem.appendChild(colorIndicator);
        categoryItem.appendChild(categoryName);
        categoryItem.appendChild(editButton);
        categoryItem.appendChild(deleteButton);

        categoriesList.appendChild(categoryItem);
    });
}

function editCategory(categoryId) {
    const category = projectData.categories.find(cat => cat.id === categoryId);
    if (!category) return;

    // Switch to the "Add Category" tab
    categoriesModal.querySelector('.tab-button[data-tab="add"]').click();

    // Populate the form with existing category data
    document.getElementById('categoryName').value = category.name;
    $("#categoryColor").spectrum("set", category.color);

    // Store the category ID in the form for editing
    document.getElementById('addCategoryForm').setAttribute('data-edit-id', categoryId);
    document.querySelector('#addCategoryForm button[type="submit"]').textContent = 'Update Category';
}

function deleteCategory(categoryId) {
    const confirmDelete = confirm('Are you sure you want to delete this category?');
    if (!confirmDelete) return;

    // Remove category from projectData
    projectData.categories = projectData.categories.filter(cat => cat.id !== categoryId);

    // Remove categoryId from tasks that used this category
    projectData.tasks.forEach(task => {
        if (task.categoryId === categoryId) {
            delete task.categoryId;
        }
    });

    renderCategoriesList();
    updateCategoryOptions();
    renderGanttChart(projectData);
    saveProjectData(projectData, true);
}

function updateCategoryOptions() {
    const categorySelect = document.getElementById('taskCategory');
    categorySelect.innerHTML = '';

    projectData.categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category.id;
        option.textContent = category.name;
        categorySelect.appendChild(option);
    });
}

openTaskModalButton.addEventListener('click', () => {
    modalTitle.textContent = 'Add Task';
    // Include all tasks as potential dependencies
    updateDependenciesOptions();
    updateCategoryOptions();
    taskModal.style.display = 'block';
});

closeModalButton.addEventListener('click', () => {
    taskModal.style.display = 'none';
    document.getElementById('addTaskForm').reset();
    document.getElementById('formErrorMessage').textContent = '';
    choices.removeActiveItems();
});

window.addEventListener('click', (event) => {
    if (event.target === taskModal) {
        taskModal.style.display = 'none';
        document.getElementById('addTaskForm').reset();
    }
});

document.addEventListener('DOMContentLoaded', () => {
    flatpickr("#taskStart", {
        dateFormat: "Y-m-d",
    });

    // Initial loading of project data from local storage
    const savedProjectData = localStorage.getItem('projectData');
    if (savedProjectData) {
        projectData = JSON.parse(savedProjectData);

        // Initialize `categories` if it's undefined
        if (!Array.isArray(projectData.categories)) {
            projectData.categories = [];
        }

        // Initialize `people` if it's undefined
        if (!Array.isArray(projectData.people)) {
            projectData.people = [];
        }

        updateProjectNameDisplay();
        updateCategoryOptions();
        renderCategoriesList();

        const savedFileName = localStorage.getItem('fileName') || 'Last Project';

        // Inform user that autosave to file is not enabled
        const statusMessage = document.getElementById('statusMessage');
        statusMessage.innerHTML = 'Autosave to file is not enabled. Please <a href="#" id="saveNowLink">save your project</a> to enable autosave to file.';
        statusMessage.style.color = 'red';

        // Add event listener to the link
        document.getElementById('saveNowLink').addEventListener('click', function(event) {
            event.preventDefault();
            document.getElementById('saveProject').click();
        });
    } else {
        // No saved project data; use default empty projectData
        projectData = { projectName: 'Untitled Project', tasks: [], categories: [], people: [] };
        updateProjectNameDisplay();
        updateCategoryOptions();
        renderCategoriesList();
    }

    // Now render the chart and update dependencies
    renderGanttChart(projectData);
    updateDependenciesOptions();
});
function getStatusClass(status) {
    switch (status) {
        case 'on-track':
            return 'status-on-track';
        case 'some risk':
            return 'status-some-risk';
        case 'high risk':
            return 'status-high-risk';
        case 'scrapped':
            return 'status-scrapped';
        case 'finished':
            return 'status-finished';
        default:
            return '';
    }
}
function renderPeopleList() {
    const peopleList = document.getElementById('peopleList');
    peopleList.innerHTML = '';

    projectData.people.forEach((person) => {
        const personItem = document.createElement('div');
        personItem.classList.add('person-item');

        const personName = document.createElement('span');
        personName.textContent = person.name || 'Unnamed Person';

        const editButton = document.createElement('button');
        editButton.innerHTML = '<i class="fas fa-edit"></i>';
        editButton.addEventListener('click', () => {
            editPerson(person.id);
        });

        const deleteButton = document.createElement('button');
        deleteButton.innerHTML = '<i class="fas fa-trash-alt"></i>';
        deleteButton.addEventListener('click', () => {
            deletePerson(person.id);
        });

        personItem.appendChild(personName);
        personItem.appendChild(editButton);
        personItem.appendChild(deleteButton);

        peopleList.appendChild(personItem);
    });
}

function editPerson(personId) {
    const person = projectData.people.find(p => p.id === personId);
    if (!person) return;

    // Switch to the "Add Person" tab
    peopleModal.querySelector('.tab-button[data-tab="add-person"]').click();

    // Populate the form with existing person data
    document.getElementById('personName').value = person.name;

    // Store the person ID in the form for editing
    document.getElementById('addPersonForm').setAttribute('data-edit-id', personId);
    document.querySelector('#addPersonForm button[type="submit"]').textContent = 'Update Person';
}

function deletePerson(personId) {
    const confirmDelete = confirm('Are you sure you want to delete this person?');
    if (!confirmDelete) return;

    // Remove person from projectData
    projectData.people = projectData.people.filter(p => p.id !== personId);

    // Remove personId from tasks that have this person assigned
    projectData.tasks.forEach(task => {
        if (Array.isArray(task.assignedPeople)) {
            task.assignedPeople = task.assignedPeople.filter(id => id !== personId);
        }
    });

    renderPeopleList();
    updatePeopleOptions();
    saveProjectData(projectData, true);
}

function updatePeopleOptions() {
    const peopleChoicesList = projectData.people.map(person => ({
        value: person.id.toString(),
        label: person.name
    }));

    peopleChoices.clearChoices();
    peopleChoices.setChoices(peopleChoicesList, 'value', 'label', false);
}

document.getElementById('addPersonForm').addEventListener('submit', function(event) {
    event.preventDefault();
    const personNameInput = document.getElementById('personName');
    const personName = personNameInput.value.trim();

    if (!personName) {
        personNameInput.focus();
        return;
    }

    const editId = event.target.getAttribute('data-edit-id');

    if (editId) {
        // Update existing person
        const person = projectData.people.find(p => p.id === parseInt(editId, 10));
        if (person) {
            person.name = personName;
        }
        // Reset form
        event.target.removeAttribute('data-edit-id');
        document.querySelector('#addPersonForm button[type="submit"]').textContent = 'Add Person';
    } else {
        // Add new person
        const person = {
            id: Date.now(),
            name: personName
        };
        projectData.people.push(person);
    }

    // Update UI and save data
    renderPeopleList();
    updatePeopleOptions();
    saveProjectData(projectData, true);

    // Reset the form
    event.target.reset();
});
