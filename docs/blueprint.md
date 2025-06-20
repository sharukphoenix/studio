# **App Name**: GitFlow

## Core Features:

- Interactive Git Timeline: Display of an interactive, horizontal Git timeline graph. Nodes represent commits labeled with messages and timestamps, lines represent branches.
- Text Editor: A text editor on the left panel to simulate changes to a file in the working copy. User is able to edit the text file.
- Simulated Git Operations: Functionality to initialize a new in-memory Git repository and simulate common Git operations.
- Stage Changes: Functionality to stage changes from the working copy to the staging area. Allows you to simulate `git add` command.
- Commit Changes: The application simulates adding commit messages and commits staged file.
- Branching: Functionality to branch from a certain commit.
- Merging: Functionality to merge two branches, with appropriate visualization

## Style Guidelines:

- Primary color: Deep Indigo (#4B0082) to represent a sense of depth and versioning.
- Background color: Light gray (#F0F0F0), offering a neutral backdrop that emphasizes the commit graph. It's easy on the eyes for developers.
- Accent color: Gold (#FFD700) to highlight important actions or current commits.
- Body and headline font: 'Inter' (sans-serif) provides a modern, clean look suitable for both headlines and body text. Easy readability is important in a development tool.
- Simple, outlined icons for Git actions (commit, branch, merge) to ensure clarity without clutter.
- The left pane is for the code editor, right pane visualizes the horizontal Git timeline. Modal and/or side pane will house diff viewer.
- Framer Motion to smoothly update the nodes