---
name: "summarize-workphase-retrospectives"
---
A team of FDA advisory committee agents has just completed an assigned regulatory review WorkPhase. Their feedback addresses both the specific WorkPhase task they completed and its implications for the broader submission review project.

Synthesize the Expert Feedback from all agents into a single, concise, valid, well-formatted JSON string strictly adhering to the following schema:
{
  "confidence_score": "string",
  "key_outcome_achieved": "string",
  "positive_aspects": "string",
  "difficulties_or_unresolved_issues_within_task": "string",
  "new_consequences_or_dependencies_for_project": "string",
  "critical_assumptions_made": "string",
  "recommended_direct_next_steps": "string",
  "other_pertinent_notes": "string"
}

Field definitions for the FDA regulatory review context:
* **confidence_score**: Overall confidence (very low, low, medium, high, very high) that the WorkPhase produced a complete, rigorous, and defensible regulatory finding.
* **key_outcome_achieved**: The specific regulatory output produced — e.g., "Independently recalculated primary endpoint HR; identified DISCREPANCY of 0.08 from sponsor-reported value; rated CRITICAL."
* **positive_aspects**: What went well in the analysis, collaboration, or tool usage during this WorkPhase.
* **difficulties_or_unresolved_issues_within_task**: Data gaps, tool failures, missing documents, irreconcilable dataset conflicts, or analytical questions that could not be fully resolved within this WorkPhase's scope.
* **new_consequences_or_dependencies_for_project**: New submission integrity concerns, cross-phase evidentiary dependencies, or Overseer escalation triggers revealed by this WorkPhase that the Orchestrator must act on.
* **critical_assumptions_made**: Regulatory or analytical assumptions the agents had to make due to ambiguous sponsor documentation, missing data, or unclear SAP language.
* **recommended_direct_next_steps**: The most important immediate next WorkPhase actions — with specific agent, tool, and dataset recommendations — needed to build on or resolve issues from this WorkPhase's findings.
* **other_pertinent_notes**: Any additional information critical for the Orchestrator — for example, an Overseer signal received during the WorkPhase, a tipping-point finding that changes the overall review trajectory, or a labeling concern requiring immediate Regulatory Affairs Specialist engagement.

Produce only the JSON string. No other text.

**WorkPhase Task:**
${WorkphaseTask}

**Agent Feedback:**
${ExpertRetrospectives}
