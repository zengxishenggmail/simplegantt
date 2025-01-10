const translations = {
  en: {
    projectName: "Untitled Project",
    save: "Save",
    saveAs: "Save As",
    loadProject: "Load Project",
    newProject: "New Project",
    addTask: "Add Task",
    editTask: "Edit Task",
    deleteTask: "Delete Task",
    addMilestone: "Add Milestone",
    editMilestone: "Edit Milestone",
    deleteMilestone: "Delete Milestone",
    manageCategories: "Manage Categories",
    managePeople: "Manage People",
    settings: "Settings",
    fullscreen: "Fullscreen",
    exitFullscreen: "Exit Fullscreen",
    toggleFullscreen: "Fullscreen",
    horizontal: "Horizontal",
    vertical: "Vertical",
    horizontalZoom: "Horizontal",
    verticalZoom: "Vertical",
    zoomToggleButton: "Show zoom controls",
    language: {
      en: "English",
      zh: "中文"
    },
    taskDetails: {
      name: "Task Name",
      startDate: "Start Date",
      duration: "Duration (days)",
      category: "Category",
      assignedTo: "Assigned To",
      dependencies: "Dependencies",
      description: "Description",
      status: "Status",
      dependentTasks: "Dependent Tasks"
    },
    taskName: "Task Name",
    description: "Description",
    assignment: "Assignment",
    taskStatus: "Task Status",
    statusExplanation: "Status Explanation",
    status: {
      notStarted: "Not Started",
      inProgress: "In Progress",
      completed: "Completed",
      onHold: "On Hold",
      onTrack: "On Track",
      someRisk: "Some Risk of Delay",
      highRisk: "High Risk of Delay",
      scrapped: "Scrapped",
      finished: "Finished"
    },
    categories: {
      title: "Manage Categories",
      name: "Category Name",
      color: "Category Color",
      add: "Add Category",
      view: "View Categories",
      edit: "Edit Category",
      delete: "Delete Category"
    },
    people: {
      title: "Manage People",
      name: "Person Name",
      add: "Add Person",
      view: "View People",
      edit: "Edit Person",
      delete: "Delete Person"
    },
    milestones: {
      title: "Milestone Details",
      name: "Milestone Name",
      date: "Date",
      category: "Category",
      description: "Description",
      emoji: "Select Emoji"
    },
    timeScaleUnit: {
      label: "Time Scale Unit",
      description: "Select how the time scale is displayed in the chart",
      days: "Days",
      weeks: "Weeks",
      months: "Months"
    },
    buttons: {
      edit: "Edit",
      delete: "Delete",
      save: "Save",
      cancel: "Cancel"
    },
    confirmDelete: "Are you sure you want to delete this item?",
    noFileLoaded: "No file loaded.",
    saveSettings: "Save Settings",
    categoryFilter: "Filter by Category",
    yes: "Yes",
    no: "No",
    cancel: "Cancel",
    small: "Select any comments about the status"
  },
  zh: {
    projectName: "未命名项目",
    save: "保存",
    saveAs: "另存为",
    loadProject: "加载项目",
    newProject: "新建项目",
    addTask: "添加任务",
    editTask: "编辑任务",
    deleteTask: "删除任务",
    addMilestone: "添加里程碑",
    editMilestone: "编辑里程碑",
    deleteMilestone: "删除里程碑",
    manageCategories: "管理分类",
    managePeople: "管理人员",
    settings: "设置",
    fullscreen: "全屏",
    exitFullscreen: "退出全屏",
    toggleFullscreen: "全屏",
    horizontal: "水平",
    vertical: "垂直",
    horizontalZoom: "水平缩放",
    verticalZoom: "垂直缩放",
    zoomToggleButton: "显示缩放控制",
    language: {
      en: "English",
      zh: "中文"
    },
    taskDetails: {
      name: "任务名称",
      startDate: "开始日期",
      duration: "持续时间（天）",
      category: "分类",
      assignedTo: "分配给",
      dependencies: "依赖项",
      description: "描述",
      status: "状态",
      dependentTasks: "依赖此任务的任务"
    },
    taskName: "任务名称",
    description: "描述",
    assignment: "任务分配",
    taskStatus: "任务状态",
    statusExplanation: "状态说明",
    status: {
      notStarted: "未开始",
      inProgress: "进行中",
      completed: "已完成",
      onHold: "暂停",
      onTrack: "正常",
      someRisk: "有延迟风险",
      highRisk: "高延迟风险",
      scrapped: "已废弃",
      finished: "已完成"
    },
    categories: {
      title: "管理分类",
      name: "分类名称",
      color: "分类颜色",
      add: "添加分类",
      view: "查看分类",
      edit: "编辑分类",
      delete: "删除分类"
    },
    people: {
      title: "管理人员",
      name: "人员姓名",
      add: "添加人员",
      view: "查看人员",
      edit: "编辑人员",
      delete: "删除人员"
    },
    milestones: {
      title: "里程碑详情",
      name: "里程碑名称",
      date: "日期",
      category: "分类",
      description: "描述",
      emoji: "选择表情"
    },
    timeScaleUnit: {
      label: "时间刻度单位",
      description: "选择在图表中如何显示时间刻度",
      days: "天",
      weeks: "周",
      months: "月"
    },
    buttons: {
      edit: "编辑",
      delete: "删除",
      save: "保存",
      cancel: "取消"
    },
    confirmDelete: "确定要删除这个项目吗？",
    noFileLoaded: "未加载文件",
    saveSettings: "保存设置",
    categoryFilter: "按分类筛选",
    yes: "是",
    no: "否",
    cancel: "取消",
    small: "添加任何关于状态的说明"
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
  // Update all elements with data-i18n attribute
  document.querySelectorAll('[data-i18n]').forEach(element => {
    const key = element.getAttribute('data-i18n');
    const translation = t(key);
    
    // Special handling for buttons with icons
    if (element.tagName === 'BUTTON' && element.innerHTML.includes('class="fas')) {
      const iconHtml = element.querySelector('i').outerHTML;
      element.innerHTML = `${iconHtml} ${translation}`;
    } else if (element.tagName === 'OPTION') {
      element.textContent = translation;
    } else if (element.tagName === 'SMALL') {
      element.textContent = translation;
    } else if (element.tagName === 'TEXTAREA') {
      element.placeholder = translation;
    } else {
      element.textContent = translation;
    }
  });

  // Update modal titles and content
  document.querySelectorAll('.modal-title').forEach(element => {
    const key = element.getAttribute('data-i18n');
    if (key) {
      element.textContent = t(key);
    }
  });

  // Update select options with data-i18n
  document.querySelectorAll('select option[data-i18n]').forEach(option => {
    const key = option.getAttribute('data-i18n');
    option.textContent = t(key);
  });

  // Update placeholders with data-i18n-placeholder
  document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
    const key = element.getAttribute('data-i18n-placeholder');
    element.placeholder = t(key);
  });

  // Refresh the Gantt chart to update any dynamic content
  if (typeof window.renderGanttChart === 'function' && window.projectData) {
    window.renderGanttChart(window.projectData);
  }
}

// Export the functions and current language
window.i18n = {
  setLanguage,
  t,
  currentLang,
  updatePageContent
};
