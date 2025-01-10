const translations = {
  en: {
    projectName: "Untitled Project",
    save: "Save",
    saveAs: "Save As",
    loadProject: "Load Project",
    newProject: "New Project",
    addTask: "Add Task",
    addMilestone: "Add Milestone",
    manageCategories: "Manage Categories",
    managePeople: "Manage People",
    settings: "Settings",
    fullscreen: "Fullscreen",
    horizontal: "Horizontal",
    vertical: "Vertical",
    taskDetails: {
      name: "Task Name",
      startDate: "Start Date",
      duration: "Duration (days)",
      category: "Category",
      assignedTo: "Assigned To",
      dependencies: "Dependencies",
      description: "Description",
      status: "Status"
    },
    status: {
      notStarted: "Not Started",
      inProgress: "In Progress",
      completed: "Completed",
      onHold: "On Hold"
    },
    categories: {
      title: "Manage Categories",
      name: "Category Name",
      color: "Color"
    },
    milestones: {
      title: "Milestone Details",
      name: "Milestone Name",
      date: "Date",
      category: "Category",
      description: "Description"
    },
    confirmDelete: "Are you sure you want to delete this item?",
    yes: "Yes",
    no: "No",
    cancel: "Cancel"
  },
  zh: {
    projectName: "未命名项目",
    save: "保存",
    saveAs: "另存为",
    loadProject: "加载项目",
    newProject: "新建项目",
    addTask: "添加任务",
    addMilestone: "添加里程碑",
    manageCategories: "管理分类",
    managePeople: "管理人员",
    settings: "设置",
    fullscreen: "全屏",
    horizontal: "水平",
    vertical: "垂直",
    taskDetails: {
      name: "任务名称",
      startDate: "开始日期",
      duration: "持续时间（天）",
      category: "分类",
      assignedTo: "分配给",
      dependencies: "依赖项",
      description: "描述",
      status: "状态"
    },
    status: {
      notStarted: "未开始",
      inProgress: "进行中",
      completed: "已完成",
      onHold: "暂停"
    },
    categories: {
      title: "管理分类",
      name: "分类名称",
      color: "颜色"
    },
    milestones: {
      title: "里程碑详情",
      name: "里程碑名称",
      date: "日期",
      category: "分类",
      description: "描述"
    },
    confirmDelete: "确定要删除这个项目吗？",
    yes: "是",
    no: "否",
    cancel: "取消"
  }
};

let currentLang = 'en';

function setLanguage(lang) {
  if (translations[lang]) {
    currentLang = lang;
    updatePageContent();
  }
}

function t(key) {
  const keys = key.split('.');
  let value = translations[currentLang];
  for (const k of keys) {
    value = value[k];
    if (!value) return key;
  }
  return value;
}

function updatePageContent() {
  // Update static content
  document.getElementById('projectNameDisplay').textContent = t('projectName');
  document.querySelector('#saveProject').innerHTML = `<i class="fas fa-save"></i> ${t('save')}`;
  document.querySelector('#saveAsProject').innerHTML = `<i class="fas fa-save"></i> ${t('saveAs')}`;
  document.querySelector('#loadProject').innerHTML = `<i class="fas fa-folder-open"></i> ${t('loadProject')}`;
  document.querySelector('#newProject').innerHTML = `<i class="fas fa-file"></i> ${t('newProject')}`;
  document.querySelector('#openTaskModal').innerHTML = `<i class="fas fa-plus"></i> ${t('addTask')}`;
  document.querySelector('#openMilestoneModal').innerHTML = `<i class="fas fa-flag"></i> ${t('addMilestone')}`;
  document.querySelector('#manageCategoriesButton').innerHTML = `<i class="fas fa-tags"></i> ${t('manageCategories')}`;
  document.querySelector('#managePeopleButton').innerHTML = `<i class="fas fa-users"></i> ${t('managePeople')}`;
  document.querySelector('#openSettingsModal').innerHTML = `<i class="fas fa-cog"></i> ${t('settings')}`;
  document.querySelector('#toggleFullscreen').innerHTML = `<i class="fas fa-expand"></i> ${t('fullscreen')}`;
  
  // Update form labels
  document.querySelectorAll('[data-i18n]').forEach(element => {
    const key = element.getAttribute('data-i18n');
    element.textContent = t(key);
  });

  // Refresh the Gantt chart to update any dynamic content
  if (typeof renderGanttChart === 'function') {
    renderGanttChart(projectData);
  }
}

// Export the functions and current language
window.i18n = {
  setLanguage,
  t,
  currentLang,
  updatePageContent
};
