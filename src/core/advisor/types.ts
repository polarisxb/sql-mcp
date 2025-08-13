export type SuggestionLevel = 'must' | 'should' | 'nice'

export interface PlanSignal {
	id: string
	message: string
	evidence?: Record<string, unknown>
}

export interface RiskItem {
	id: string
	level: SuggestionLevel
	reason: string
	evidence?: Record<string, unknown>
}

export interface PlanAnalysis {
	summary: string[]
	risks: RiskItem[]
	signals: PlanSignal[]
	flags: {
		usingFilesort: boolean
		usingTemporary: boolean
	}
}

export interface Suggestion {
	id: string
	level: SuggestionLevel
	action: string
	reason: string
	evidence?: Record<string, unknown>
}

export interface AdvisorEvidence {
	plan?: any
	analysis?: PlanAnalysis
	suggestions?: Suggestion[]
	rewrites?: { description: string; sql?: string }[]
} 