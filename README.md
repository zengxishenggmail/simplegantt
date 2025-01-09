# SimpleGantt

![Screenshot 2025-01-09 at 17 58 25](https://github.com/user-attachments/assets/c4f317b8-4b8d-4169-bc89-78fd2d02b5fe)

SimpleGantt is a lightweight project management tool designed for environments where software installation is restricted and cloud web applications are not permitted. It runs entirely in the browser.

[Try it live here](https://aerugo.github.io/simplegantt/simplegantt), data is saved locally.

# Requirements
SimpleGantt requires a modern web browser with support for HTML5 and JavaScript. It has been tested on the latest versions of Chrome, Firefox, and Edge. It also depends on a number of third-party libraries which are pulled in via CDN. See the `simplegantt.html` file for the list of dependencies.

## Features
- Interactive Gantt chart rendering
- Task management with dependencies
- Milestone tracking
- Offline usage without installation
- No reliance on external web services (except CDNs for libraries) or cloud storage

## Getting Started
Simply open the `simplegantt.html` file in your web browser to start using SimpleGantt. No servers or installation required.
Project files are saved locally in .yaml format.

## Using With SharePoint
Many enterprise environments restrict the use of cloud-based project management tools. SimpleGantt can be used with SharePoint to provide a simple project management solution that is accessible across the organization in a restricted environment. To use SimpleGantt with SharePoint:
1. Upload the repository files to a SharePoint document library.
2. Rename `simplegantt.html` to `simplegantt.aspx`.

SimpleGantt can now be accessed via the SharePoint document library. Saving and loading project files to SharePoint is usually restricted, and in these cases, users can save project files locally and manually upload them to SharePoint.

## Usage
- **Creating Tasks**: Add new tasks with start dates, durations, and dependencies.
- **Editing Tasks**: Modify task details and adjust timelines via drag-and-drop. Hold 'Shift' to enable changing task duration in the Gantt chart.
- **Milestones**: Mark key events using milestones.
- **Saving Projects**: Save your project data locally to avoid data loss.

## Contributing
Contributions are welcome, but support is limited. I don't have much time to spend on this project. 
Please submit a pull request or open an issue for improvements and feature requests, but I may not be able to address them in the near future.

## License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
