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

// Function to evaluate a move's strategic value
function evaluateMove(nodeStates, move, currentPlayer, isPlacementPhase) {
    let score = 0;
    let newStates = [...nodeStates];
    const opponent = currentPlayer === 1 ? 2 : 1;

    // Simulate the move
    if (isPlacementPhase) {
        newStates[move] = currentPlayer;
    } else {
        newStates[move.to] = currentPlayer;
        newStates[move.from] = 0;
    }

    // 1. Center control (highest priority)
    if (isPlacementPhase && move === 4) {
        score += 5;
    }

    // 2. Check if this move creates a potential winning opportunity
    for (let combo of winningCombinations) {
        let playerPieces = combo.filter(index => newStates[index] === currentPlayer).length;
        let emptySpaces = combo.filter(index => newStates[index] === 0).length;
        if (playerPieces === 2 && emptySpaces === 2) score += 4;
    }

    // 3. Check if this move blocks opponent's potential winning opportunities
    for (let combo of winningCombinations) {
        let opponentPieces = combo.filter(index => newStates[index] === opponent).length;
        let emptySpaces = combo.filter(index => newStates[index] === 0).length;
        if (opponentPieces === 2 && emptySpaces === 2) score += 3;
    }

    // 4. Mobility evaluation
    let mobility = 0;
    if (!isPlacementPhase) {
        for (let i = 0; i < newStates.length; i++) {
            if (newStates[i] === currentPlayer) {
                mobility += adjacencyList[i].filter(j => newStates[j] === 0).length;
            }
        }
        score += mobility * 0.5;
    }

    // 5. Corner control
    const corners = [0, 2, 6, 8];
    if (isPlacementPhase && corners.includes(move)) {
        score += 2;
    }

    // 6. Defensive positioning
    if (!isPlacementPhase) {
        const defensivePositions = [1, 3, 5, 7];
        if (defensivePositions.includes(move.to)) {
            score += 1;
        }
    }

    return score;
}

// Function to let AI make a move
function aiMakeMove(nodeStates, currentPlayer, isPlacementPhase, playerMoves, maxMoves, difficulty = "beginner") {
    let aiMove = null;
    const opponent = currentPlayer === 1 ? 2 : 1;

    switch (difficulty) {
        case "beginner":
            aiMove = getRandomMove(nodeStates, currentPlayer, isPlacementPhase, playerMoves, maxMoves);
            break;

        case "legendary":
            // Get all possible moves
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

            // If no moves available, return null
            if (availableMoves.length === 0) {
                return null;
            }

            // 1. Check for winning move
            const winningMove = canWinInNextMove(nodeStates, currentPlayer);
            if (winningMove !== null) {
                if (isPlacementPhase) {
                    if (availableMoves.includes(winningMove)) {
                        return winningMove;
                    }
                } else {
                    for (let move of availableMoves) {
                        if (move.to === winningMove) {
                            return move;
                        }
                    }
                }
            }

            // 2. Block opponent's winning move
            const opponentWinningMove = canWinInNextMove(nodeStates, opponent);
            if (opponentWinningMove !== null) {
                if (isPlacementPhase) {
                    if (availableMoves.includes(opponentWinningMove)) {
                        return opponentWinningMove;
                    }
                } else {
                    for (let move of availableMoves) {
                        if (move.to === opponentWinningMove) {
                            return move;
                        }
                    }
                }
            }

            // 3. Make strategic move
            let bestMove = null;
            let bestScore = -Infinity;

            for (let move of availableMoves) {
                const score = evaluateMove(nodeStates, move, currentPlayer, isPlacementPhase);
                if (score > bestScore) {
                    bestScore = score;
                    bestMove = move;
                }
            }

            // If we found a good strategic move, use it
            if (bestMove !== null) {
                return bestMove;
            }

            // 4. Fallback to random move if no strategic move found
            aiMove = getRandomMove(nodeStates, currentPlayer, isPlacementPhase, playerMoves, maxMoves);
            break;
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