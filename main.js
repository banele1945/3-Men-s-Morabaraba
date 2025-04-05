import { aiMakeMove } from "./ai.js";

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
const canvas = document.querySelector(`canvas`); 
const webgl = canvas.getContext(`webgl`);
    const turnIndicator = document.getElementById("turnIndicator");
    const gameContainer = document.querySelector(".game-container");

if (!webgl) {
    throw new Error("WebGL not supported");
}

webgl.clearColor(1.0, 1.0, 1.0, 1.0);
webgl.clear(webgl.COLOR_BUFFER_BIT);

const vertices = new Float32Array([
    // Outer Square
    -0.5, -0.5, 0.5, -0.5,
    0.5, -0.5, 0.5, 0.5,
    0.5, 0.5, -0.5, 0.5,
    -0.5, 0.5, -0.5, -0.5,

    // Middle lines
    0.0, -0.5, 0.0, 0.5,
    -0.5, 0.0, 0.5, 0.0,

    // Diagonals
    -0.5, -0.5, 0.5, 0.5,
    0.5, -0.5, -0.5, 0.5
]);

// Storing intersection points
const intersections = [
    [-0.5, -0.5], [0, -0.5], [0.5, -0.5],
    [-0.5, 0], [0, 0], [0.5, 0],
    [-0.5, 0.5], [0, 0.5], [0.5, 0.5]
];

// Winning combinations
const winningCombinations = [
    // Rows
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    // Columns
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    // Diagonals
    [0, 4, 8], [2, 4, 6]
];

// Store clicked nodes (0 = not clicked, 1 = clicked)
let nodeStates = new Array(intersections.length).fill(0);
let nodeScales = new Array(intersections.length).fill(1.0); // Scale for animations
let selectedNode = null; // Track the selected node

const buffer = webgl.createBuffer();
webgl.bindBuffer(webgl.ARRAY_BUFFER, buffer);
webgl.bufferData(webgl.ARRAY_BUFFER, vertices, webgl.STATIC_DRAW);
webgl.viewport(0, 0, canvas.width, canvas.height);

// Vertex and Fragment Shaders for the board
const vsSource = `
attribute vec2 pos;
void main() {
    gl_Position = vec4(pos, 0, 1);
}`;

const fsSource = `
precision mediump float;
void main() {
    gl_FragColor = vec4(0.2, 1.0, 1.0, 1.0);
}`;

// Compile shader function
function compileShader(type, source) {
    const shader = webgl.createShader(type);
    webgl.shaderSource(shader, source);
    webgl.compileShader(shader);
    
    const success = webgl.getShaderParameter(shader, webgl.COMPILE_STATUS);
    if (!success) {
        console.error(webgl.getShaderInfoLog(shader));
        webgl.deleteShader(shader);
        return null;
    }
    return shader;
}

// Create shader program function
function createProgram(vertexSource, fragmentSource) {
    const program = webgl.createProgram();
    const vertexShader = compileShader(webgl.VERTEX_SHADER, vertexSource);
    const fragmentShader = compileShader(webgl.FRAGMENT_SHADER, fragmentSource);
    
    if (vertexShader && fragmentShader) {
        webgl.attachShader(program, vertexShader);
        webgl.attachShader(program, fragmentShader);
        webgl.linkProgram(program);
    }
    
    return program;
}

// Create the main program and node program
const program = createProgram(vsSource, fsSource);

// Vertex & Fragment Shader for nodes (circles)
const nodeVsSource = `
attribute vec2 pos;
void main() {
    gl_Position = vec4(pos, 0, 1);
}`;

const nodeFsSource = `
precision mediump float;
uniform int selected;
void main() {
    if (selected == 1) {
        gl_FragColor = vec4(1.0, 0.2, 0.2, 1.0); // Player 1 (Red)
    } else if (selected == 2) {
        gl_FragColor = vec4(0.2, 0.2, 1.0, 1.0); // Player 2 (Blue)
    } else if (selected == 3) {
        gl_FragColor = vec4(1.0, 1.0, 0.2, 1.0); // Hovered (Yellow)
    } else {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0); // Default Black
    }
}`;

// Create node program
const nodeProgram = createProgram(nodeVsSource, nodeFsSource);

const positionLocation = webgl.getAttribLocation(program, `pos`);
webgl.vertexAttribPointer(positionLocation, 2, webgl.FLOAT, false, 0, 0);
webgl.enableVertexAttribArray(positionLocation);
webgl.drawArrays(webgl.LINES, 0, vertices.length / 2);

// A separate buffer for circles (nodes)
const circleBuffer = webgl.createBuffer();

// Function to create circle vertices
function createCircleVertices(cx, cy, radius, segments = 20) {
    let vertices = [cx, cy]; // Center point
    let angleStep = (2 * Math.PI) / segments;

    for (let i = 0; i <= segments; i++) {
        let angle = i * angleStep;
        let x = cx + Math.cos(angle) * radius;
        let y = cy + Math.sin(angle) * radius;
        vertices.push(x, y);
    }

    return new Float32Array(vertices);
}

// Function to draw circles (nodes)
function drawNodes() {
    webgl.useProgram(program);
    webgl.bindBuffer(webgl.ARRAY_BUFFER, buffer);
    webgl.vertexAttribPointer(positionLocation, 2, webgl.FLOAT, false, 0, 0);
    webgl.enableVertexAttribArray(positionLocation);
    webgl.drawArrays(webgl.LINES, 0, vertices.length / 2);

    webgl.useProgram(nodeProgram);
    webgl.bindBuffer(webgl.ARRAY_BUFFER, circleBuffer);

    intersections.forEach(([cx, cy], index) => {
        let circleVertices = createCircleVertices(cx, cy, 0.05 * nodeScales[index]);
        webgl.bufferData(webgl.ARRAY_BUFFER, circleVertices, webgl.STATIC_DRAW);
        webgl.vertexAttribPointer(positionLocation, 2, webgl.FLOAT, false, 0, 0);
        webgl.enableVertexAttribArray(positionLocation);

        // Set uniform for selected state
        webgl.uniform1i(webgl.getUniformLocation(nodeProgram, "selected"), nodeStates[index]);
        webgl.drawArrays(webgl.TRIANGLE_FAN, 0, circleVertices.length / 2);
    });
}

// Initial drawing of nodes
drawNodes();

// Load audio files
const audioPlace = new Audio('place.mp3'); // Sound for placing a piece
const audioWin = new Audio('win.mp3'); // Sound for winning

    // Game state variables
    let isSinglePlayer = false;
let currentPlayer = 1;
let playerMoves = { 1: 0, 2: 0 };
const maxMoves = 3;
let isPlacementPhase = true;
let hoveredNode = null;
    let currentDifficulty = "beginner"; // Add difficulty tracking

    // Add scoring system variables
    let playerScore = 0;
    let gamesPlayed = 0;
    let gamesWon = 0;
    let totalMoves = 0;
    let startTime = null;

// Function to update turn display
function updateTurnDisplay() {
    if (currentPlayer === 1) {
        turnIndicator.innerHTML = "Player 1's Turn (🔴)";
        turnIndicator.style.color = "red";
    } else {
        turnIndicator.innerHTML = "Player 2's Turn (🔵)";
        turnIndicator.style.color = "blue";
    }
}

    // Function to update score display
    function updateScoreDisplay() {
        const scoreElement = document.getElementById("playerScore");
        const statsElement = document.getElementById("gameStats");
        
        if (scoreElement && statsElement) {
            scoreElement.textContent = `Score: ${playerScore}`;
            statsElement.innerHTML = `
                Games Played: ${gamesPlayed}<br>
                Games Won: ${gamesWon}<br>
                Win Rate: ${gamesPlayed > 0 ? Math.round((gamesWon / gamesPlayed) * 100) : 0}%<br>
                Average Moves: ${gamesPlayed > 0 ? Math.round(totalMoves / gamesPlayed) : 0}
            `;
        }
    }

    // Function to calculate score for a game
    function calculateGameScore(isWinner, moves, timeTaken) {
        let score = 0;
        
        // Base points for winning
        if (isWinner) {
            score += 100;
        }
        
        // Bonus points based on difficulty
        switch (currentDifficulty) {
            case "beginner":
                score += isWinner ? 50 : 0;
                break;
            case "legendary":
                score += isWinner ? 200 : 0;
                break;
        }
        
        // Efficiency bonus (fewer moves = more points)
        const maxMoves = 24; // Maximum possible moves in a game
        const moveEfficiency = 1 - (moves / maxMoves);
        score += Math.round(moveEfficiency * 50);
        
        // Time bonus (faster wins = more points)
        const maxTime = 300; // 5 minutes in seconds
        const timeEfficiency = 1 - (timeTaken / maxTime);
        score += Math.round(timeEfficiency * 30);
        
        return score;
}

// Mouse move event for hover effect
canvas.addEventListener("mousemove", function(event) {
    let rect = canvas.getBoundingClientRect();
    let mouseX = (event.clientX - rect.left) / canvas.width * 2 - 1;
    let mouseY = 1 - (event.clientY - rect.top) / canvas.height * 2;

    hoveredNode = null; // Reset hoveredNode

    for (let i = 0; i < intersections.length; i++) {
        let [cx, cy] = intersections[i];
        let dx = mouseX - cx;
        let dy = mouseY - cy;
        let distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 0.05) { // Mouse is over a node
            hoveredNode = i; // Store the index of the hovered node
            break;
        }
    }
});

// Click event for placing/moving pieces
canvas.addEventListener("click", function(event) {
        if (isSinglePlayer && currentPlayer === 2) return; // Prevent player moves during AI's turn
        
    let rect = canvas.getBoundingClientRect();
    let mouseX = (event.clientX - rect.left) / canvas.width * 2 - 1;
    let mouseY = 1 - (event.clientY - rect.top) / canvas.height * 2;

    for (let i = 0; i < intersections.length; i++) {
        let [cx, cy] = intersections[i];
        let dx = mouseX - cx;
        let dy = mouseY - cy;
        let distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 0.05) { // Click inside a node
            if (isPlacementPhase) {
                // Placement Phase
                if (nodeStates[i] === 0 && playerMoves[currentPlayer] < maxMoves) {
                        nodeStates[i] = currentPlayer;
                    playerMoves[currentPlayer]++;
                        nodeScales[i] = 1.2;
                        setTimeout(() => nodeScales[i] = 1.0, 200);
                    drawNodes();
                        audioPlace.play();
                        totalMoves++; // Increment total moves for valid placement
                        updateScoreDisplay();

                        if (checkWin(currentPlayer)) return;

                        // Check if placement phase is complete
                        if (playerMoves[1] === maxMoves && playerMoves[2] === maxMoves) {
                            isPlacementPhase = false;
                            currentPlayer = 1; // Player 1 starts movement phase
                            updateTurnDisplay();
                            return;
                        }

                        // Switch turns if placement phase is not complete
                        currentPlayer = currentPlayer === 1 ? 2 : 1;
                    updateTurnDisplay();

                        // If in single player mode and it's AI's turn
                        if (isSinglePlayer && currentPlayer === 2) {
                            setTimeout(() => {
                                let aiMove = aiMakeMove(nodeStates, currentPlayer, isPlacementPhase, playerMoves, maxMoves, currentDifficulty);
                                if (aiMove !== null) {
                                    // Apply the AI move to the game state
                                    if (isPlacementPhase) {
                                        nodeStates[aiMove] = currentPlayer;
                                        playerMoves[currentPlayer]++;
                                    } else {
                                        nodeStates[aiMove.to] = currentPlayer;
                                        nodeStates[aiMove.from] = 0;
                                    }
                                    
                                    nodeScales[isPlacementPhase ? aiMove : aiMove.to] = 1.2;
                                    setTimeout(() => nodeScales[isPlacementPhase ? aiMove : aiMove.to] = 1.0, 200);
                                    drawNodes();
                                    audioPlace.play();
                                    totalMoves++;
                                    updateScoreDisplay();

                                    if (checkWin(currentPlayer)) return;

                                    // Check if placement phase is complete after AI move
                                    if (playerMoves[1] === maxMoves && playerMoves[2] === maxMoves) {
                                        isPlacementPhase = false;
                                        currentPlayer = 1;
                                        updateTurnDisplay();
                                        return;
                                    }

                                    currentPlayer = 1;
                                    updateTurnDisplay();
                                }
                            }, 500);
                        }
                }
            } else {
                // Movement Phase
                if (nodeStates[i] === currentPlayer) {
                        // Select a piece to move
                        selectedNode = i;
                        nodeScales[selectedNode] = 1.2;
                        setTimeout(() => nodeScales[selectedNode] = 1.0, 200);
                        drawNodes();
                } else if (selectedNode !== null) {
                        // Try to move the selected piece
                    if (adjacencyList[selectedNode].includes(i) && nodeStates[i] === 0) {
                            // Valid move
                        nodeStates[i] = currentPlayer;
                        nodeStates[selectedNode] = 0;
                            selectedNode = null;
                            nodeScales[i] = 1.2;
                            setTimeout(() => nodeScales[i] = 1.0, 200);
                        drawNodes();
                            audioPlace.play();
                            totalMoves++; // Increment total moves for valid movement
                            updateScoreDisplay();

                        if (checkWin(currentPlayer)) {
                                audioWin.play();
                                return;
                        }

                        currentPlayer = currentPlayer === 1 ? 2 : 1; 
                        updateTurnDisplay();

                            // If in single player mode and it's AI's turn
                            if (isSinglePlayer && currentPlayer === 2) {
                                setTimeout(() => {
                                    let aiMove = aiMakeMove(nodeStates, currentPlayer, isPlacementPhase, playerMoves, maxMoves, currentDifficulty);
                                    if (aiMove !== null) {
                                        // Apply the AI move to the game state
                                        nodeStates[aiMove.to] = currentPlayer;
                                        nodeStates[aiMove.from] = 0;
                                        
                                        nodeScales[aiMove.to] = 1.2;
                                        setTimeout(() => nodeScales[aiMove.to] = 1.0, 200);
                                        drawNodes();
                                        audioPlace.play();
                                        totalMoves++;
                                        updateScoreDisplay();

                                        if (checkWin(currentPlayer)) return;

                                        currentPlayer = 1;
                                        updateTurnDisplay();
                                    }
                                }, 500);
                            }
                    } else {
                            // Invalid move - deselect the piece
                            selectedNode = null;
                            drawNodes();
                    }
                }
            }
        }
    }
});

function checkWin(player) {
    // Check all winning combinations
    for (let combo of winningCombinations) {
        if (combo.every(index => nodeStates[index] === player)) {
            setTimeout(() => {
                alert(`Player ${player} wins! 🎉`);
                    audioWin.play();
                    
                    // Calculate and update score only in single player mode and when Player 1 wins
                    if (isSinglePlayer && player === 1) {
                        const timeTaken = (Date.now() - startTime) / 1000; // Convert to seconds
                        const gameScore = calculateGameScore(true, totalMoves, timeTaken);
                        playerScore += gameScore;
                        gamesPlayed++;
                        gamesWon++; // Only increment gamesWon when Player 1 wins
                        updateScoreDisplay();
                    } else if (isSinglePlayer && player === 2) {
                        // If AI wins, just increment games played without awarding points or wins
                        gamesPlayed++;
                        updateScoreDisplay();
                    }
                    
                    // Automatically restart the game after a short delay in both modes
                    setTimeout(() => {
                        restartGame();
                    }, 1000);
                }, 100);
                return true;
            }
        }
        return false;
}

// Define adjacency rules: each node can only move to certain neighbors
const adjacencyList = {
    0: [1, 3], 1: [0, 2, 4], 2: [1, 5], 
    3: [0, 4, 6], 4: [1, 3, 5, 7], 5: [2, 4, 8], 
    6: [3, 7], 7: [4, 6, 8], 8: [5, 7]
};

    // Button event listeners
    document.getElementById("twoPlayerBtn").addEventListener("click", startTwoPlayerGame);
document.getElementById("singlePlayerBtn").addEventListener("click", function() {
    document.querySelector(".mode-selection").style.display = "none";
    document.getElementById("difficultySelection").style.display = "block";
});
    document.getElementById("beginnerBtn").addEventListener("click", () => startSinglePlayerGame("beginner"));
    document.getElementById("legendaryBtn").addEventListener("click", () => startSinglePlayerGame("legendary"));

    // Function to start Single Player mode
    function startSinglePlayerGame(difficulty) {
        currentDifficulty = difficulty;
        isSinglePlayer = true;
        restartGame();
        document.getElementById("difficultySelection").style.display = "none";
        gameContainer.style.display = "block";
        // Show score display and back button for single player mode
        document.getElementById("scoreDisplay").style.display = "block";
        backButton.style.display = "block";
    }

    // Function to start Two Player mode
    function startTwoPlayerGame() {
        isSinglePlayer = false;
        restartGame();
        document.querySelector(".mode-selection").style.display = "none";
        gameContainer.style.display = "block";
        // Hide score display but show back button for two player mode
        document.getElementById("scoreDisplay").style.display = "none";
        backButton.style.display = "block";
    }

    function restartGame() {
        nodeStates = new Array(intersections.length).fill(0);
        nodeScales = new Array(intersections.length).fill(1.0);
        playerMoves = { 1: 0, 2: 0 };
        currentPlayer = 1;
        isPlacementPhase = true;
        selectedNode = null;
        hoveredNode = null;
        drawNodes();
        updateTurnDisplay();
        
        // Reset game-specific variables
        totalMoves = 0;
        startTime = Date.now();
        
        // Update score display
        updateScoreDisplay();
    }

    // Initial display
    updateTurnDisplay();

    // Add game controls container
    const gameControls = document.createElement("div");
    gameControls.className = "game-controls";
    gameControls.innerHTML = `
        <h1>Align It</h1>
        <p id="turnIndicator">Player 1's Turn (🔴)</p>
    `;
    gameContainer.insertBefore(gameControls, canvas);

    // Add score display elements to the HTML
    const scoreDisplay = document.createElement("div");
    scoreDisplay.id = "scoreDisplay";
    scoreDisplay.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: rgba(255, 255, 255, 0.9);
        padding: clamp(10px, 2vw, 15px);
        border-radius: 10px;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        font-family: Arial, sans-serif;
        display: none;
        max-width: 90%;
        z-index: 100;
    `;
    
    const scoreElement = document.createElement("div");
    scoreElement.id = "playerScore";
    scoreElement.style.fontSize = "24px";
    scoreElement.style.fontWeight = "bold";
    scoreElement.style.marginBottom = "10px";
    
    const gameStats = document.createElement("div");
    gameStats.id = "gameStats";
    gameStats.style.fontSize = "14px";
    gameStats.style.lineHeight = "1.5";
    
    scoreDisplay.appendChild(scoreElement);
    scoreDisplay.appendChild(gameStats);
    gameContainer.appendChild(scoreDisplay);

    // Add back button
    const backButton = document.createElement("button");
    backButton.id = "backButton";
    backButton.textContent = "← Back to Menu";
    backButton.style.cssText = `
        position: absolute;
        top: 20px;
        left: 20px;
        padding: 10px 20px;
        background-color: #4CAF50;
        color: white;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        font-size: 16px;
        font-family: Arial, sans-serif;
        transition: background-color 0.3s;
        display: none; // Initially hidden
    `;

    // Add hover effect
    backButton.addEventListener('mouseover', () => {
        backButton.style.backgroundColor = '#45a049';
    });

    backButton.addEventListener('mouseout', () => {
        backButton.style.backgroundColor = '#4CAF50';
    });

    // Add click handler
    backButton.addEventListener('click', () => {
        // Hide game container and score display
        gameContainer.style.display = "none";
        scoreDisplay.style.display = "none";
        backButton.style.display = "none";

        // Show mode selection
        document.querySelector(".mode-selection").style.display = "block";
        document.getElementById("difficultySelection").style.display = "none";

        // Reset game state
        restartGame();
    });

    gameContainer.appendChild(backButton);
    
    // Initialize score display
    updateScoreDisplay();
});