# Windows Installation Guide for Campus Connect

This guide will help you set up and run the Campus Connect application on Windows.

## Prerequisites

1.  **Node.js**: Download and install the LTS version of Node.js from [nodejs.org](https://nodejs.org/).
2.  **Git** (Optional but recommended): Download and install Git from [git-scm.com](https://git-scm.com/).

## Installation Steps

1.  **Download the Code**:
    *   If you have Git, open PowerShell or Command Prompt and run:
        ```powershell
        git clone <repository_url>
        cd NKDPROJECT25
        ```
    *   Or download the ZIP file, extract it, and open the folder in PowerShell/Command Prompt.

2.  **Install Dependencies**:
    Run the following command in the project folder:
    ```powershell
    npm install
    ```

3.  **Initialize the Database**:
    This project uses SQLite. You can seed the database with initial data by running:
    ```powershell
    npm run seed
    ```
    *Note: If `npm run seed` fails or if the script doesn't exist, the database will likely be created automatically when you start the server based on `database.js` logic.*

4.  **Start the Server**:
    To run the application:
    ```powershell
    npm start
    ```
    You should see a message like: `Server is running on http://localhost:3000`

5.  **Access the App**:
    Open your web browser (Chrome, Edge, Firefox) and go to:
    [http://localhost:3000](http://localhost:3000)

## Troubleshooting

-   **'npm' is not recognized**: Ensure Node.js is installed and added to your PATH environment variable. Restart your terminal after installing Node.js.
-   **Port 3000 is in use**: If you see an error about the port being busy, open `server/index.js` and change `const PORT = process.env.PORT || 3000;` to another number like `3001`, then try again.
