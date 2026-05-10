---
name: "delegate-tool-string"
---
**WorkPhase Delegation Tool (${strings/tool-prefix}STARTWORKPHASE)**
*   **Purpose:** Assign a specific investigative task to a specialized agent. This is the primary tool for the Paper Audit Orchestrator.
*   **Syntax:**
${strings/tool-prefix}STARTWORKPHASE
AGENT: <Name of the expert persona to assign>
PHASE_TYPE: <Name of the WorkPhase template to use>
TASK_DESCRIPTION: <A highly specific, adversarial prompt detailing exactly what the agent must investigate, calculate, or verify>
END_STARTWORKPHASE
