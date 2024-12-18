let projectData = { tasks: [] };
let fileHandle;

const PIXELS_PER_DAY = 30; // Increase the value for better spacing
const TASK_HEIGHT = 30; // Should match the height in your CSS .task-bar
const TASK_SPACING = 5; // Space between task bars

function displayProjectName(name) {
    document.getElementById('projectName').textContent = `Project: ${name}`;
}

document.getElementById('loadProject').addEventListener('change', async function(event) {
    const file = event.target.files[0];
    if (!file) return;

    fileHandle = null; // Reset fileHandle since we're loading from the input

    try {
        const yamlText = await file.text();
        projectData = jsyaml.load(yamlText);

        if (!projectData || !Array.isArray(projectData.tasks)) {
            throw new Error('Invalid project data format.');
        }

        console.log('Loaded projectData:', projectData);
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
    fileHandle = null; // Reset fileHandle to prompt for new save location
    await saveProjectData(projectData);
});

document.getElementById('addTaskForm').addEventListener('submit', function(event) {
    event.preventDefault();
    const submitButton = event.target.querySelector('button[type="submit"]');
    const editIndex = submitButton.getAttribute('data-edit-index');

    const dependenciesSelect = document.getElementById('taskDependencies');
    const dependencies = Array.from(dependenciesSelect.selectedOptions).map(option => parseInt(option.value));

    const task = {
        name: document.getElementById('taskName').value,
        start: document.getElementById('taskStart').value,
        duration: parseInt(document.getElementById('taskDuration').value),
        dependencies: dependencies
    };

    if (editIndex !== null) {
        // Update existing task
        projectData.tasks[editIndex] = task;
        submitButton.textContent = 'Add Task';
        submitButton.removeAttribute('data-edit-index');
    } else {
        // Add new task
        projectData.tasks.push(task);
    }

    renderGanttChart(projectData);
    updateDependenciesOptions();
    event.target.reset();
});

function renderTimeScale(projectStartDate, projectEndDate) {
    // Convert to UTC
    projectStartDate = new Date(projectStartDate.toISOString().split('T')[0] + 'T00:00:00Z');
    projectEndDate = new Date(projectEndDate.toISOString().split('T')[0] + 'T00:00:00Z');

    const timeScale = document.createElement('div');
    timeScale.classList.add('time-scale');

    const days = (projectEndDate - projectStartDate) / (1000 * 60 * 60 * 24);
    for (let i = 0; i <= days; i++) {
        if (i % 2 === 0) { // Show label every 2 days
            const date = new Date(projectStartDate.getTime() + i * 24 * 60 * 60 * 1000);
            const dateLabel = document.createElement('div');
            dateLabel.classList.add('date-label');
            dateLabel.style.left = `${i * PIXELS_PER_DAY}px`;
            dateLabel.textContent = date.toLocaleDateString();
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
        // If the task has dependencies, adjust its start date
        if (task.dependencies && task.dependencies.length > 0) {
            const latestDependencyEnd = task.dependencies.reduce((latestDate, depIndex) => {
                const depTask = projectData.tasks[depIndex];
                const depStart = new Date(depTask.start + 'T00:00:00Z');
                const depEnd = new Date(depStart.getTime() + depTask.duration * 24 * 60 * 60 * 1000);
                return depEnd > latestDate ? depEnd : latestDate;
            }, new Date(0));

            // Adjust task start date if necessary
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

        // Calculate the vertical position for the task bar
        const taskTopPosition = index * (TASK_HEIGHT + TASK_SPACING);
        taskElement.style.top = `${taskTopPosition}px`;

        taskElement.innerHTML = `
            ${task.name}
            <button class="edit-task" data-index="${index}">Edit</button>
            <button class="delete-task" data-index="${index}">Delete</button>
        `;

        ganttChart.appendChild(taskElement);
    });

    // Set the height of the Gantt chart container
    const ganttChartHeight = projectData.tasks.length * (TASK_HEIGHT + TASK_SPACING);
    ganttChart.style.height = `${ganttChartHeight}px`;
}

// Remove the addTaskEventListeners function

// Add a single event listener to the ganttChart element
document.getElementById('ganttChart').addEventListener('click', function(event) {
    if (event.target.classList.contains('edit-task')) {
        editTask(event);
    } else if (event.target.classList.contains('delete-task')) {
        deleteTask(event);
    }
});

function editTask(event) {
    const taskIndex = event.target.getAttribute('data-index');
    const task = projectData.tasks[taskIndex];

    document.getElementById('taskName').value = task.name;
    document.getElementById('taskStart').value = task.start;
    document.getElementById('taskDuration').value = task.duration;

    // Update the dependencies select
    const dependenciesSelect = document.getElementById('taskDependencies');
    Array.from(dependenciesSelect.options).forEach(option => {
        option.selected = task.dependencies.includes(parseInt(option.value));
    });

    // Update the submit button for editing
    const submitButton = document.querySelector('#addTaskForm button[type="submit"]');
    submitButton.textContent = 'Update Task';
    submitButton.setAttribute('data-edit-index', taskIndex);
}

function deleteTask(event) {
    const taskIndex = event.target.getAttribute('data-index');
    projectData.tasks.splice(taskIndex, 1);
    renderGanttChart(projectData);
    updateDependenciesOptions();
}

function updateDependenciesOptions() {
    const dependenciesSelect = document.getElementById('taskDependencies');
    dependenciesSelect.innerHTML = ''; // Clear existing options

    projectData.tasks.forEach((task, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = task.name;
        dependenciesSelect.appendChild(option);
    });
}

async function saveProjectData(projectData) {
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
                return;
            }
        }
        const writable = await fileHandle.createWritable();
        await writable.write(jsyaml.dump(projectData));
        await writable.close();
        alert('Project saved successfully.');
    } else {
        // Fallback for browsers without File System Access API
        const yamlData = jsyaml.dump(projectData);
        const blob = new Blob([yamlData], {type: 'text/yaml'});
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'project.yaml';
        link.click();
        URL.revokeObjectURL(url);
        alert('Project saved successfully.');
    }
}

// Remove the onProjectDataChange function as we're no longer auto-saving

renderGanttChart(projectData);
updateDependenciesOptions();
