---
name: "optimizer-tool-string"
---
**Statistical Model Optimization Tool (${strings/tool-prefix}OPTIMIZE)**
*   **Purpose:** Run complex, multi-variable optimizations or tipping-point analyses to determine how much data would need to be fabricated or excluded to achieve the authors' reported p-value.
*   **Syntax:**
${strings/tool-prefix}OPTIMIZE
DATASET: <File name>
TARGET_METRIC: <The specific statistic to target>
PARAMETERS: <JSON string of parameters to vary>
END_OPTIMIZE
