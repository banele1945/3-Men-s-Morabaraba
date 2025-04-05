// AI for Morabaraba - Two difficulty levels
function getRandomMove(nodeStates, currentPlayer, isPlacementPhase, playerMoves, maxMoves) {
    let availableMoves = [];
    
    if (isPlacementPhase) {
        // In placement phase, find all empty nodes
        for (let i = 0; i < nodeStates.length; i++) {
            if (nodeStates[i] === 0 && playerMoves[currentPlayer] < maxMoves) {
                availableMoves.push(i);
            }
        }
    } else {
        // In movement phase, find all possible moves for current player's pieces
        for (let i = 0; i < nodeStates.length; i++) {
            if (nodeStates[i] === currentPlayer) {
                // Check all adjacent positions
                for (let j = 0; j < nodeStates.length; j++) {
                    if (nodeStates[j] === 0 && adjacencyList[i].includes(j)) {
                        availableMoves.push({from: i, to: j});
                    }
                }
            }
        }
    }

    if (availableMoves.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * availableMoves.length);
    return availableMoves[randomIndex];
}

// Function to check if a player can win in the next move
function canWinInNextMove(nodeStates, player) {
    // Check all winning combinations
    for (let combo of winningCombinations) {
        // Count how many pieces the player has in this combination
        let playerPieces = combo.filter(index => nodeStates[index] === player).length;
        let emptySpaces = combo.filter(index => nodeStates[index] === 0).length;
        
        // If player has 2 pieces and there's 1 empty space, they can win
        if (playerPieces === 2 && emptySpaces === 1) {
            // Return the empty space index
            return combo.find(index => nodeStates[index] === 0);
        }
    }
    return null;
}

// Function to let AI make a move
function aiMakeMove(nodeStates, currentPlayer, isPlacementPhase, playerMoves, maxMoves, difficulty = "beginner") {
    let aiMove = null;

    switch (difficulty) {
        case "beginner":
            aiMove = getRandomMove(nodeStates, currentPlayer, isPlacementPhase, playerMoves, maxMoves);
            break;

        case "legendary":
            // First check if AI can win
            aiMove = canWinInNextMove(nodeStates, currentPlayer);
            if (aiMove !== null) {
                // AI can win, make the winning move
                if (isPlacementPhase) {
                    nodeStates[aiMove] = currentPlayer;
                    playerMoves[currentPlayer]++;
                } else {
                    // Find the piece to move
                    for (let i = 0; i < nodeStates.length; i++) {
                        if (nodeStates[i] === currentPlayer && adjacencyList[i].includes(aiMove)) {
                            nodeStates[aiMove] = currentPlayer;
                            nodeStates[i] = 0;
                            aiMove = {from: i, to: aiMove};
                            break;
                        }
                    }
                }
                return aiMove;
            }

            // Check if opponent can win and block
            const opponent = currentPlayer === 1 ? 2 : 1;
            const opponentWinningMove = canWinInNextMove(nodeStates, opponent);
            
            // Get all possible moves for the AI
            let availableMoves = [];
            if (isPlacementPhase) {
                for (let i = 0; i < nodeStates.length; i++) {
                    if (nodeStates[i] === 0 && playerMoves[currentPlayer] < maxMoves) {
                        availableMoves.push(i);
                    }
                }
            } else {
                for (let i = 0; i < nodeStates.length; i++) {
                    if (nodeStates[i] === currentPlayer) {
                        for (let j = 0; j < nodeStates.length; j++) {
                            if (nodeStates[j] === 0 && adjacencyList[i].includes(j)) {
                                availableMoves.push({from: i, to: j});
                            }
                        }
                    }
                }
            }

            // If there are no available moves, return null
            if (availableMoves.length === 0) {
                return null;
            }

            // If opponent has a winning move, try to block it
            if (opponentWinningMove !== null) {
                // Check if blocking the winning move is possible
                if (isPlacementPhase) {
                    if (availableMoves.includes(opponentWinningMove)) {
                        aiMove = opponentWinningMove;
                        nodeStates[aiMove] = currentPlayer;
                        playerMoves[currentPlayer]++;
                        return aiMove;
                    }
                } else {
                    // In movement phase, try to find a piece that can block
                    for (let move of availableMoves) {
                        if (move.to === opponentWinningMove) {
                            aiMove = move;
                            nodeStates[move.to] = currentPlayer;
                            nodeStates[move.from] = 0;
                            return aiMove;
                        }
                    }
                }
            }

            // If we can't block or there's no winning move to block,
            // make a strategic move that doesn't put us in immediate danger
            let bestMove = null;
            let bestScore = -Infinity;

            for (let move of availableMoves) {
                let score = 0;
                let newStates = [...nodeStates];

                // Simulate the move
                if (isPlacementPhase) {
                    newStates[move] = currentPlayer;
                } else {
                    newStates[move.to] = currentPlayer;
                    newStates[move.from] = 0;
                }

                // Evaluate the move
                // 1. Check if this move creates a potential winning opportunity
                for (let combo of winningCombinations) {
                    let playerPieces = combo.filter(index => newStates[index] === currentPlayer).length;
                    let emptySpaces = combo.filter(index => newStates[index] === 0).length;
                    if (playerPieces === 2 && emptySpaces === 2) score += 3;
                }

                // 2. Check if this move blocks opponent's potential winning opportunities
                for (let combo of winningCombinations) {
                    let opponentPieces = combo.filter(index => newStates[index] === opponent).length;
                    let emptySpaces = combo.filter(index => newStates[index] === 0).length;
                    if (opponentPieces === 2 && emptySpaces === 2) score += 2;
                }

                // 3. Check mobility (number of possible moves after this move)
                let mobility = 0;
                if (!isPlacementPhase) {
                    for (let i = 0; i < newStates.length; i++) {
                        if (newStates[i] === currentPlayer) {
                            mobility += adjacencyList[i].filter(j => newStates[j] === 0).length;
                        }
                    }
                    score += mobility * 0.5;
                }

                // Update best move if this move has a better score
                if (score > bestScore) {
                    bestScore = score;
                    bestMove = move;
                }
            }

            // If we found a good strategic move, make it
            if (bestMove !== null) {
                aiMove = bestMove;
                if (isPlacementPhase) {
                    nodeStates[aiMove] = currentPlayer;
                    playerMoves[currentPlayer]++;
                } else {
                    nodeStates[aiMove.to] = currentPlayer;
                    nodeStates[aiMove.from] = 0;
                }
                return aiMove;
            }

            // If no strategic move found, make a random move
            // Even if we're in a losing position, we'll make a move
            aiMove = getRandomMove(nodeStates, currentPlayer, isPlacementPhase, playerMoves, maxMoves);
            if (aiMove !== null) {
                if (isPlacementPhase) {
                    nodeStates[aiMove] = currentPlayer;
                    playerMoves[currentPlayer]++;
                } else {
                    nodeStates[aiMove.to] = currentPlayer;
                    nodeStates[aiMove.from] = 0;
                }
            }
            break;
    }
    
    if (aiMove !== null) {
        if (isPlacementPhase) {
            nodeStates[aiMove] = currentPlayer;
            playerMoves[currentPlayer]++;
        } else {
            nodeStates[aiMove.to] = currentPlayer;
            nodeStates[aiMove.from] = 0;
        }
    }
    
    return aiMove;
}

// Define adjacency rules for the board
const adjacencyList = {
    0: [1, 3], 1: [0, 2, 4], 2: [1, 5], 
    3: [0, 4, 6], 4: [1, 3, 5, 7], 5: [2, 4, 8], 
    6: [3, 7], 7: [4, 6, 8], 8: [5, 7]
};

// Define winning combinations
const winningCombinations = [
    // Rows
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    // Columns
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    // Diagonals
    [0, 4, 8], [2, 4, 6]
];

// Export AI function
export { aiMakeMove };