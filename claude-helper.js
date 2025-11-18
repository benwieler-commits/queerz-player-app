// ================================
// CLAUDE API HELPER
// Intelligent assistance for QUEERZ! gameplay
// ================================

/**
 * Call Claude API with game context
 * @param {string} userMessage - The question or situation to ask Claude about
 * @param {object} gameContext - Current character/game state
 * @returns {Promise<string>} - Claude's response
 */
export async function askClaude(userMessage, gameContext = {}) {
    try {
        const response = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "claude-sonnet-4-20250514",
                max_tokens: 1000,
                messages: [
                    {
                        role: "user",
                        content: buildClaudePrompt(userMessage, gameContext)
                    }
                ]
            })
        });

        if (!response.ok) {
            throw new Error(`Claude API error: ${response.status}`);
        }

        const data = await response.json();
        return data.content[0].text;
    } catch (error) {
        console.error('Error calling Claude:', error);
        return `Sorry, I couldn't connect to Claude right now. Error: ${error.message}`;
    }
}

/**
 * Build a comprehensive prompt for Claude with game context
 */
function buildClaudePrompt(userMessage, gameContext) {
    const {
        characterName = "Unknown",
        selectedMove = null,
        clickedTags = [],
        totalPower = 0,
        rollResult = null,
        currentStatuses = [],
        juice = 0,
        themes = []
    } = gameContext;

    // Build the context string
    let contextString = `You are an intelligent assistant for QUEERZ!, a TTRPG system. Help this player understand their situation and options.

**CHARACTER:** ${characterName}
**CURRENT MOVE:** ${selectedMove || "None selected"}
**TAGS BEING USED:** ${clickedTags.length > 0 ? clickedTags.join(', ') : 'None'}
**TOTAL POWER:** ${totalPower}
**JUICE:** ${juice}
**ACTIVE STATUSES:** ${currentStatuses.map(s => `${s.name} (${s.modifier})`).join(', ') || 'None'}

`;

    // Add roll result context if available
    if (rollResult) {
        contextString += `**LAST ROLL:** ${rollResult.die1} + ${rollResult.die2} + 1 (base) + ${rollResult.power} (power) = ${rollResult.total}
**RESULT:** ${rollResult.total >= 10 ? '10+ (Success)' : rollResult.total >= 7 ? '7-9 (Partial Success)' : 'Miss (6-)'}\n\n`;
    }

    // Add themes context
    if (themes.length > 0) {
        contextString += `**CHARACTER THEMES:**\n`;
        themes.forEach((theme, i) => {
            if (theme.name) {
                contextString += `- ${theme.name} (${theme.type}): ${theme.powerTags.filter(t => t).join(', ')}\n`;
            }
        });
        contextString += '\n';
    }

    contextString += `**PLAYER'S QUESTION:** ${userMessage}

**IMPORTANT RULES TO FOLLOW:**
1. Base your advice ONLY on official QUEERZ! rules
2. Be concise (2-3 sentences max unless explaining a complex move)
3. Use helpful formatting (bullets, bold)
4. Don't make up moves or mechanics that don't exist
5. If you don't know something, say so

**CORE MOVES SUMMARY:**
- SLAY: Give status (tier=Power). 10+=choose 2, 7-9=choose 1: (Killing it, +1 tier, Coverage, Take something, Keep focus, Comeback)
- STRIKE A POSE: Get Juice=Power. Spend on tags/statuses (temporary). 10+=min 2 Juice + upgrades (Prolong, Scale up, Flashier)
- GET A CLUE: Get Clues=Power. Spend to ask questions. 7-9: MC can add complication (Counter Question, Side Effects, Drama)
- TALK IT OUT: Choose: Make progress, Strike deal, or Bond (relationship status tier=Power). 7-9: complication (Condition, Show Understanding, Get Attached)
- CARE: Remove tiers/tags=Power. 7-9: Take tier-1 side effect
- RESIST: 10+=no status, 7-9=status with -1 tier, miss=full status
- BE VULNERABLE: 10+=success!, 7-9=success but complication (Side Effects, Burnout, Drama), miss=fail or success+hard move

Respond helpfully and clearly!`;

    return contextString;
}

/**
 * Quick helpers for common scenarios
 */

export async function explainMoveResult(moveName, rollTotal, power, gameContext) {
    const message = `I just rolled ${rollTotal} (with Power ${power}) for ${moveName}. What does this result mean and what are my options?`;
    return await askClaude(message, gameContext);
}

export async function suggestTagsForAction(actionDescription, gameContext) {
    const message = `I want to: "${actionDescription}". Which of my tags would make sense to use for this action?`;
    return await askClaude(message, gameContext);
}

export async function helpWithJuiceSpending(power, moveName, gameContext) {
    const message = `I have ${power} Juice from ${moveName}. What are some good things I could create? Give me 3-4 specific examples based on my character.`;
    return await askClaude(message, gameContext);
}

export async function suggestAppropriateMove(actionDescription, gameContext) {
    const message = `I want to: "${actionDescription}". Which Core Move should I use?`;
    return await askClaude(message, gameContext);
}

export async function explainComplication(complication, moveName, gameContext) {
    const message = `My MC gave me this complication for ${moveName}: "${complication}". What does this mean for my character?`;
    return await askClaude(message, gameContext);
}