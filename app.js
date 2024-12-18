let projectData = { projectName: 'Untitled Project', tasks: [] };
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

const PIXELS_PER_DAY = 30;
const TASK_HEIGHT = 30;
const TASK_SPACING = 5;
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
    let taskStartDate = new Date(task.start + 'T00:00:00Z');

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
            } catch (parseError) {
                console.error('YAML Parsing Error:', parseError);
                throw new Error('Failed to parse YAML: ' + parseError.message);
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
    projectData = { projectName: 'Untitled Project', tasks: [] };
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

    // Collect dependencies
    let dependencies = Array.from(document.querySelectorAll('input[name="taskDependencies"]:checked'))
        .map(checkbox => parseInt(checkbox.value));

    // If editing, remove self-dependency just in case
    if (editIndex !== null) {
        const currentIndex = parseInt(editIndex, 10);
        dependencies = dependencies.filter(depIndex => depIndex !== currentIndex);
    }

    const task = {
        name: document.getElementById('taskName').value,
        start: document.getElementById('taskStart').value,
        duration: parseInt(document.getElementById('taskDuration').value),
        dependencies: dependencies
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
        daySeparator.style.left = `${i * PIXELS_PER_DAY}px`;
        timeScale.appendChild(daySeparator);

        // Add date labels at intervals
        if (i % 7 === 0 || i === 0 || i === days) {
            const dateLabel = document.createElement('div');
            dateLabel.classList.add('date-label');
            dateLabel.style.left = `${i * PIXELS_PER_DAY}px`;
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

    projectData.tasks.forEach((task, index) => {
        const taskElement = document.createElement('div');
        taskElement.classList.add('task-bar');

        taskElement.style.width = `${task.duration * PIXELS_PER_DAY}px`;

        const taskStartDate = taskStartDates[index];
        const daysFromStart = (taskStartDate - projectStartDate) / (1000 * 60 * 60 * 24);

        taskElement.style.left = `${daysFromStart * PIXELS_PER_DAY}px`;

        const taskTopPosition = GANTT_CHART_PADDING_TOP + index * (TASK_HEIGHT + TASK_SPACING);
        taskElement.style.top = `${taskTopPosition}px`;

        const tooltipContent = `
            Name: ${task.name}
            Start: ${taskStartDate.toISOString().split('T')[0]}
            Duration: ${task.duration} days
            Dependencies: ${task.dependencies.map(depIndex => projectData.tasks[depIndex]?.name).join(', ') || 'None'}
        `;

        taskElement.setAttribute('data-tooltip', tooltipContent);

        taskElement.innerHTML = `
            ${task.name}
            <button class="edit-task" data-index="${index}"><i class="fas fa-edit"></i></button>
            <button class="delete-task" data-index="${index}"><i class="fas fa-trash-alt"></i></button>
        `;
        taskElement.setAttribute('role', 'button');
        taskElement.setAttribute('tabindex', '0');
        taskElement.setAttribute('aria-label', `Task: ${task.name}`);

        fragment.appendChild(taskElement);
    });

    ganttChart.appendChild(fragment);

    const ganttChartHeight = projectData.tasks.length * (TASK_HEIGHT + TASK_SPACING);
    ganttChart.style.height = `${ganttChartHeight}px`;
}

document.getElementById('ganttChart').addEventListener('click', function(event) {
    const editButton = event.target.closest('.edit-task');
    const deleteButton = event.target.closest('.delete-task');
    if (editButton) {
        editTask(editButton);
    } else if (deleteButton) {
        deleteTask(deleteButton);
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

    document.getElementById('taskName').value = task.name;
    document.getElementById('taskStart').value = task.start;
    document.getElementById('taskDuration').value = task.duration;

    projectData.tasks.forEach((_, index) => {
        const checkbox = document.getElementById(`dependency-${index}`);
        if (checkbox) {
            checkbox.checked = task.dependencies.includes(index);
        }
    });

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

function updateDependenciesOptions(excludeIndex = null) {
    const dependenciesContainer = document.getElementById('taskDependenciesContainer');
    dependenciesContainer.innerHTML = '';

    projectData.tasks.forEach((task, index) => {
        if (index === excludeIndex) {
            // Skip adding a dependency option for the task itself
            return;
        }
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `dependency-${index}`;
        checkbox.name = 'taskDependencies';
        checkbox.value = index;

        const label = document.createElement('label');
        label.htmlFor = `dependency-${index}`;
        label.textContent = task.name;

        const checkboxContainer = document.createElement('div');
        checkboxContainer.appendChild(checkbox);
        checkboxContainer.appendChild(label);

        dependenciesContainer.appendChild(checkboxContainer);
    });
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

openTaskModalButton.addEventListener('click', () => {
    modalTitle.textContent = 'Add Task';
    // Include all tasks as potential dependencies
    updateDependenciesOptions();
    taskModal.style.display = 'block';
});

closeModalButton.addEventListener('click', () => {
    taskModal.style.display = 'none';
    document.getElementById('addTaskForm').reset();
});

window.addEventListener('click', (event) => {
    if (event.target === taskModal) {
        taskModal.style.display = 'none';
        document.getElementById('addTaskForm').reset();
    }
});

flatpickr("#taskStart", {
    dateFormat: "Y-m-d",
});

// Initial loading of project data from local storage
const savedProjectData = localStorage.getItem('projectData');
if (savedProjectData) {
    projectData = JSON.parse(savedProjectData);
    updateProjectNameDisplay();
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
    projectData = { projectName: 'Untitled Project', tasks: [] };
    updateProjectNameDisplay();
}

// Now render the chart and update dependencies
renderGanttChart(projectData);
updateDependenciesOptions();
