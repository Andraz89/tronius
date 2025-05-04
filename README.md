# Pharaoh's Final Riddle

A slot machine game featuring an Egyptian theme with an alien invasion twist.

## Running the Game

To run and develop the game, you'll need to use two terminal windows:

### Terminal 1: Build the game (and watch for changes)
```bash
npx webpack --watch
```
This command will compile the TypeScript code and assets into the `dist` folder, and automatically rebuild whenever you make changes to the source files.

### Terminal 2: Run a local web server
```bash
npx live-server dist
```
This will start a local web server for the `dist` directory and automatically open your browser. The page will refresh whenever files in `dist` change.

## How to Play
- Click the "Spin" button to start
- Match three identical symbols on the middle row to win
- You have 5 spins to claim the Pharaoh's treasure! 