let projectData = { tasks: [] };
let fileHandle;

function displayProjectName(name) {
    document.getElementById('projectName').textContent = `Project: ${name}`;
}

document.getElementById('loadProject').addEventListener('change', function(event) {
    const file = event.target.files[0];
    const reader = new FileReader();
    reader.onload = function(e) {
        const yamlText = e.target.result;
        projectData = jsyaml.load(yamlText);
        renderGanttChart(projectData);
        displayProjectName(file.name);
    };
    reader.readAsText(file);
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
    onProjectDataChange(projectData);
});

document.getElementById('addTaskForm').addEventListener('submit', function(event) {
    event.preventDefault();
    const submitButton = event.target.querySelector('button[type="submit"]');
    const editIndex = submitButton.getAttribute('data-edit-index');

    const task = {
        name: document.getElementById('taskName').value,
        start: document.getElementById('taskStart').value,
        duration: parseInt(document.getElementById('taskDuration').value),
        dependencies: []
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
    onProjectDataChange(projectData);
    event.target.reset();
});

function renderTimeScale(projectStartDate, projectEndDate) {
    const timeScale = document.createElement('div');
    timeScale.classList.add('time-scale');

    const days = (projectEndDate - projectStartDate) / (1000 * 60 * 60 * 24);
    for (let i = 0; i <= days; i++) {
        const date = new Date(projectStartDate.getTime() + i * 24 * 60 * 60 * 1000);
        const dateLabel = document.createElement('div');
        dateLabel.classList.add('date-label');
        dateLabel.style.left = `${i * 20}px`;
        dateLabel.textContent = date.toLocaleDateString();
        timeScale.appendChild(dateLabel);
    }

    return timeScale;
}

function renderGanttChart(projectData) {
    const ganttChart = document.getElementById('ganttChart');
    ganttChart.innerHTML = '';

    if (projectData.tasks.length === 0) return;

    const startDates = projectData.tasks.map(task => new Date(task.start));
    const endDates = projectData.tasks.map(task => {
        const startDate = new Date(task.start);
        return new Date(startDate.getTime() + task.duration * 24 * 60 * 60 * 1000);
    });
    const projectStartDate = new Date(Math.min(...startDates));
    const projectEndDate = new Date(Math.max(...endDates));

    const timeScale = renderTimeScale(projectStartDate, projectEndDate);
    ganttChart.appendChild(timeScale);

    projectData.tasks.forEach((task, index) => {
        const taskElement = document.createElement('div');
        taskElement.classList.add('task-bar');

        taskElement.style.width = `${task.duration * 20}px`;

        const taskStartDate = new Date(task.start);
        const daysFromStart = (taskStartDate - projectStartDate) / (1000 * 60 * 60 * 24);

        taskElement.style.left = `${daysFromStart * 20}px`;

        taskElement.innerHTML = `
            ${task.name}
            <button class="edit-task" data-index="${index}">Edit</button>
            <button class="delete-task" data-index="${index}">Delete</button>
        `;

        ganttChart.appendChild(taskElement);
    });

    addTaskEventListeners();
}

function addTaskEventListeners() {
    document.querySelectorAll('.edit-task').forEach(button => {
        button.addEventListener('click', editTask);
    });

    document.querySelectorAll('.delete-task').forEach(button => {
        button.addEventListener('click', deleteTask);
    });
}

function editTask(event) {
    const taskIndex = event.target.getAttribute('data-index');
    const task = projectData.tasks[taskIndex];

    document.getElementById('taskName').value = task.name;
    document.getElementById('taskStart').value = task.start;
    document.getElementById('taskDuration').value = task.duration;

    // Change the form submit button to "Update Task"
    const submitButton = document.querySelector('#addTaskForm button[type="submit"]');
    submitButton.textContent = 'Update Task';
    submitButton.setAttribute('data-edit-index', taskIndex);
}

function deleteTask(event) {
    const taskIndex = event.target.getAttribute('data-index');
    projectData.tasks.splice(taskIndex, 1);
    renderGanttChart(projectData);
    onProjectDataChange(projectData);
}

async function saveProjectData(projectData) {
    if ('showSaveFilePicker' in window) {
        if (!fileHandle) {
            fileHandle = await window.showSaveFilePicker({
                suggestedName: 'project.yaml',
                types: [{
                    description: 'YAML Files',
                    accept: {'text/yaml': ['.yaml', '.yml']},
                }],
            });
            displayProjectName(fileHandle.name);
        }
        const writable = await fileHandle.createWritable();
        await writable.write(jsyaml.dump(projectData));
        await writable.close();
    } else {
        alert('Your browser does not support automatic saving. Please use a modern browser.');
    }
}

function onProjectDataChange(projectData) {
    saveProjectData(projectData);
}

renderGanttChart(projectData);
