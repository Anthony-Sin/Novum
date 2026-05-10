import { LlmBlockedError } from "../shared/errors";

export class ApiPolicyManager {
    // State is centralized here to track access to verification APIs (CrossRef, ORCID, LLM)
    private lastSentTimestamps = new Map<string, number>(); 
    private consecutiveFailures = new Map<string, number>();
    private firstFailureTimestamp = new Map<string, number>();

    // Constants for policy - Strictly limits rapid, automated queries to prevent IP bans
    // from scholarly databases while validating large batches of citations.
    private readonly BASE_RATE_LIMIT_MS = 2000;
    private readonly MAX_BACKOFF_DELAY_MS = 128000;
    private readonly PROLONGED_FAILURE_THRESHOLD_MS = 10 * 60 * 1000;

    private generateKey(apiName: string, modelName: string): string {
        return `${apiName}_${modelName}_Verification_Service`;
    }

    public reportApiSuccess(apiName: string, modelName: string): void {
        const key = this.generateKey(apiName, modelName);
        if ((this.consecutiveFailures.get(key) ?? 0) > 0) {
            this.consecutiveFailures.set(key, 0);
            this.firstFailureTimestamp.delete(key);
        }
    }

    public reportApiFailure(apiName: string, modelName: string): void {
        const key = this.generateKey(apiName, modelName);
        const now = Date.now();
        const currentFailures = this.consecutiveFailures.get(key) ?? 0;

        if (currentFailures === 0) {
            this.firstFailureTimestamp.set(key, now);
        }
        this.consecutiveFailures.set(key, currentFailures + 1);
    }

    public async trackAndApplyPolicy(apiName: string, modelName: string): Promise<void> {
        const key = this.generateKey(apiName, modelName);
        const now = Date.now();

        // Check for prolonged failure before applying delay. 
        // If the citation cross-referencing API is down, we cannot guarantee paper integrity.
        const firstFailure = this.firstFailureTimestamp.get(key);
        if (firstFailure && (now - firstFailure) >= this.PROLONGED_FAILURE_THRESHOLD_MS) {
            const errorMsg = `CRITICAL INTEGRITY RISK: Verification API ${key} has been failing for a prolonged period. Fraud detection cannot proceed reliably.`;
            console.error(errorMsg);
            throw new LlmBlockedError(errorMsg);
        }

        // Calculate rate limit delay to avoid overloading publication databases
        const lastSent = this.lastSentTimestamps.get(key) ?? 0;
        const timeSinceLast = now - lastSent;
        const rateLimitDelay = Math.max(0, this.BASE_RATE_LIMIT_MS - timeSinceLast);

        // Calculate exponential backoff delay for hallucination-detection model limits
        let backoffDelay = 0;
        const failures = this.consecutiveFailures.get(key) ?? 0;
        if (failures > 0) {
            backoffDelay = Math.min(
                this.BASE_RATE_LIMIT_MS * Math.pow(2, failures),
                this.MAX_BACKOFF_DELAY_MS
            );
        }

        // Apply the greater of the two delays to ensure we respect scientific API quotas
        const totalDelay = Math.max(rateLimitDelay, backoffDelay);
        if (totalDelay > 0) {
            await new Promise(resolve => setTimeout(resolve, totalDelay));
        }

        // Update timestamp *after* delay
        this.lastSentTimestamps.set(key, Date.now());
    }
}
