let projectData = { tasks: [] };
let fileHandle;

const PIXELS_PER_DAY = 30;
const TASK_HEIGHT = 30;
const TASK_SPACING = 5;

function displayProjectName(name) {
    document.getElementById('projectName').textContent = `Project: ${name}`;
}

document.getElementById('loadProject').addEventListener('change', async function(event) {
    const file = event.target.files[0];
    if (!file) return;

    fileHandle = null;

    try {
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

        renderGanttChart(projectData);
        displayProjectName(file.name);
        updateDependenciesOptions();
    } catch (error) {
        alert('Failed to load project: ' + error.message);
        console.error('Error loading project:', error);
    }
});

document.getElementById('newProject').addEventListener('click', async function() {
    if ('showSaveFilePicker' in window) {
        try {
            fileHandle = await window.showSaveFilePicker({
                suggestedName: 'project.yaml',
                types: [{
                    description: 'YAML Files',
                    accept: {'text/yaml': ['.yaml', '.yml']},
                }],
            });
        } catch (err) {
            console.error('File selection cancelled:', err);
            return;
        }
    } else {
        alert('Your browser does not support the File System Access API.');
        return;
    }

    projectData = { tasks: [] };
    displayProjectName(fileHandle.name);
    renderGanttChart(projectData);
    updateDependenciesOptions();
});

document.getElementById('saveProject').addEventListener('click', async function() {
    await saveProjectData(projectData);
});

document.getElementById('saveAsProject').addEventListener('click', async function() {
    fileHandle = null;
    await saveProjectData(projectData);
});

document.getElementById('addTaskForm').addEventListener('submit', async function(event) {
    event.preventDefault();
    const submitButton = event.target.querySelector('button[type="submit"]');
    const editIndex = submitButton.getAttribute('data-edit-index');

    const dependencies = Array.from(document.querySelectorAll('input[name="taskDependencies"]:checked'))
        .map(checkbox => parseInt(checkbox.value));

    const task = {
        name: document.getElementById('taskName').value,
        start: document.getElementById('taskStart').value,
        duration: parseInt(document.getElementById('taskDuration').value),
        dependencies: dependencies
    };

    if (editIndex !== null) {
        projectData.tasks[editIndex] = task;
        submitButton.textContent = 'Add Task';
        submitButton.removeAttribute('data-edit-index');
    } else {
        projectData.tasks.push(task);
    }

    renderGanttChart(projectData);
    updateDependenciesOptions();
    
    await saveProjectData(projectData);
    
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
        const dayOfWeek = date.getUTCDay();

        const daySeparator = document.createElement('div');
        daySeparator.classList.add('day-separator');
        daySeparator.style.left = `${i * PIXELS_PER_DAY}px`;
        timeScale.appendChild(daySeparator);

        if (i % 7 === 0) {
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

    const startDates = projectData.tasks.map(task => new Date(task.start + 'T00:00:00Z'));
    const endDates = projectData.tasks.map(task => {
        const startDate = new Date(task.start + 'T00:00:00Z');
        return new Date(startDate.getTime() + task.duration * 24 * 60 * 60 * 1000);
    });
    const projectStartDate = new Date(Math.min(...startDates));
    const projectEndDate = new Date(Math.max(...endDates));

    const timeScale = renderTimeScale(projectStartDate, projectEndDate);
    ganttChart.appendChild(timeScale);

    projectData.tasks.forEach((task, index) => {
        if (task.dependencies && task.dependencies.length > 0) {
            const latestDependencyEnd = task.dependencies.reduce((latestDate, depIndex) => {
                const depTask = projectData.tasks[depIndex];
                const depStart = new Date(depTask.start + 'T00:00:00Z');
                const depEnd = new Date(depStart.getTime() + depTask.duration * 24 * 60 * 60 * 1000);
                return depEnd > latestDate ? depEnd : latestDate;
            }, new Date(0));

            const taskStartDate = new Date(task.start + 'T00:00:00Z');
            if (latestDependencyEnd > taskStartDate) {
                task.start = latestDependencyEnd.toISOString().split('T')[0];
            }
        }

        const taskElement = document.createElement('div');
        taskElement.classList.add('task-bar');

        taskElement.style.width = `${task.duration * PIXELS_PER_DAY}px`;

        const taskStartDate = new Date(task.start + 'T00:00:00Z');
        const daysFromStart = (taskStartDate - projectStartDate) / (1000 * 60 * 60 * 24);

        taskElement.style.left = `${daysFromStart * PIXELS_PER_DAY}px`;

        const taskTopPosition = index * (TASK_HEIGHT + TASK_SPACING);
        taskElement.style.top = `${taskTopPosition}px`;

        const tooltipContent = `
            Name: ${task.name}
            Start: ${task.start}
            Duration: ${task.duration} days
            Dependencies: ${task.dependencies.map(depIndex => projectData.tasks[depIndex]?.name).join(', ') || 'None'}
        `;

        taskElement.setAttribute('data-tooltip', tooltipContent);

        taskElement.innerHTML = `
            ${task.name}
            <button class="edit-task" data-index="${index}">Edit</button>
            <button class="delete-task" data-index="${index}">Delete</button>
        `;

        ganttChart.appendChild(taskElement);
    });

    const ganttChartHeight = projectData.tasks.length * (TASK_HEIGHT + TASK_SPACING);
    ganttChart.style.height = `${ganttChartHeight}px`;
}

document.getElementById('ganttChart').addEventListener('click', function(event) {
    if (event.target.classList.contains('edit-task')) {
        editTask(event);
    } else if (event.target.classList.contains('delete-task')) {
        deleteTask(event);
    }
});

function editTask(event) {
    const taskIndex =
 event.target.getAttribute('data-index');
    const task = projectData.tasks[taskIndex];

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

async function deleteTask(event) {
    const taskIndex = event.target.getAttribute('data-index');
    const taskName = projectData.tasks[taskIndex].name;

    const confirmDelete = confirm(`Are you sure you want to delete the task "${taskName}"?`);
    if (!confirmDelete) return;

    projectData.tasks.splice(taskIndex, 1);
    renderGanttChart(projectData);
    updateDependenciesOptions();
    
    await saveProjectData(projectData);
}

function updateDependenciesOptions() {
    const dependenciesContainer = document.getElementById('taskDependenciesContainer');
    dependenciesContainer.innerHTML = '';

    projectData.tasks.forEach((task, index) => {
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

async function saveProjectData(projectData) {
    const statusMessage = document.getElementById('statusMessage');
    statusMessage.textContent = 'Saving...';

    if ('showSaveFilePicker' in window) {
        if (!fileHandle) {
            try {
                fileHandle = await window.showSaveFilePicker({
                    suggestedName: 'project.yaml',
                    types: [{
                        description: 'YAML Files',
                        accept: {'text/yaml': ['.yaml', '.yml']},
                    }],
                });
                displayProjectName(fileHandle.name);
            } catch (err) {
                console.error('Save cancelled:', err);
                statusMessage.textContent = 'Save cancelled.';
                return;
            }
        }
        try {
            const writable = await fileHandle.createWritable();
            await writable.write(jsyaml.dump(projectData));
            await writable.close();
            statusMessage.textContent = 'All changes saved.';
        } catch (err) {
            console.error('Error during auto-save:', err);
            statusMessage.textContent = 'Error saving changes.';
            statusMessage.style.color = 'red';
        }
    } else {
        const yamlData = jsyaml.dump(projectData);
        const blob = new Blob([yamlData], {type: 'text/yaml'});
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'project.yaml';
        link.click();
        URL.revokeObjectURL(url);
        statusMessage.textContent = 'Project saved successfully (fallback method).';
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

renderGanttChart(projectData);
updateDependenciesOptions();
