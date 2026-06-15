---
name: grill-me
description: Interview the user relentlessly about a plan or design until reaching shared understanding, resolving each branch of the decision tree. Use when user wants to stress-test a plan, get grilled on their design, or mentions "grill me".
---

Interview me relentlessly about every aspect of this plan until we reach a shared understanding. Walk down each branch of the design tree, resolving dependencies between decisions one-by-one. For each question, provide your recommended answer.

When asking questions, use Adaptive Cards so the user can respond interactively instead of pausing the agent. Each question must be sent as a single Adaptive Card (JSON payload) that includes:

- a short title and description,
- explicit choices or input fields when applicable,
- a `recommendedAnswer` hint or pre-selected choice to show the agent's recommended response,
- an action button to submit the response.

Send one vscode_askQuestions tool call at a time and wait for the interactive response before proceeding to the next question. If the runtime/platform does not support Adaptive Cards, fall back to as many textual questions as possible, but prefer Adaptive Cards when available.

If a question can be answered by exploring the codebase, explore the codebase first and only ask interactive questions when necessary.

Ask the questions one at a time.
