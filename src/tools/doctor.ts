import { loadConfig } from '../core/config/index.js'
import { container } from '../core/di/index.js'
import { DATABASE_CONNECTOR, METADATA_SERVICE } from '../core/di/tokens.js'
import { IMetadataService } from '../services/metadata/interface.js'

export interface DoctorReport {
	checks: { name: string; ok: boolean; info?: string }[]
	indexFindings?: {
		duplicates: Array<{ table: string; a: any; b: any }>
		redundantPrefixes: Array<{ table: string; redundant: any; covering: any }>
	}
}

export async function runDoctor(): Promise<{ text: string; evidence: DoctorReport }> {
	// ensure config is loaded so DI has connector/metadata
	try { loadConfig({ loadEnv: true }) } catch {}
	const checks: { name: string; ok: boolean; info?: string }[] = []
	const report: DoctorReport = { checks }
	try {
		const connector: any = container.resolve(DATABASE_CONNECTOR)
		// connectivity
		const ping = await connector?.ping?.()
		checks.push({ name: 'connectivity', ok: !!ping, info: ping ? 'ping ok' : 'ping failed' })
		// read-only probe
		try {
			await connector.executeReadQuery('SELECT 1')
			checks.push({ name: 'read_query', ok: true })
		} catch (e) {
			checks.push({ name: 'read_query', ok: false, info: (e as Error).message })
		}
		// explain availability
		try {
			const plan = await connector.getExplainPlan('SELECT 1')
			checks.push({ name: 'explain', ok: !!plan, info: plan ? 'available' : 'n/a' })
		} catch (e) {
			checks.push({ name: 'explain', ok: false, info: (e as Error).message })
		}
		// index redundancy scan (best-effort)
		try {
			const meta = container.resolve(METADATA_SERVICE) as IMetadataService
			const tables = await meta.getTables()
			const duplicates: Array<{ table: string; a: any; b: any }> = []
			const redundantPrefixes: Array<{ table: string; redundant: any; covering: any }> = []
			for (const tbl of tables) {
				const schema = await meta.getTableSchema(tbl)
				const idx = schema.indexes || []
				for (let i = 0; i < idx.length; i++) {
					for (let j = i + 1; j < idx.length; j++) {
						const a = idx[i], b = idx[j]
						if (a.columns.join(',') === b.columns.join(',')) duplicates.push({ table: tbl, a, b })
					}
				}
				for (let i = 0; i < idx.length; i++) {
					for (let j = 0; j < idx.length; j++) {
						if (i === j) continue
						const a = idx[i], b = idx[j]
						const aCols = a.columns.map(String)
						const bCols = b.columns.map(String)
						if (aCols.length < bCols.length && bCols.slice(0, aCols.length).join(',') === aCols.join(',')) {
							redundantPrefixes.push({ table: tbl, redundant: a, covering: b })
						}
					}
				}
			}
			report.indexFindings = { duplicates, redundantPrefixes }
			const dupCount = duplicates.length
			const redCount = redundantPrefixes.length
			checks.push({ name: 'index_duplicates', ok: dupCount === 0, info: dupCount ? `${dupCount} found` : 'none' })
			checks.push({ name: 'index_redundant_prefixes', ok: redCount === 0, info: redCount ? `${redCount} found` : 'none' })
		} catch {
			// ignore metadata failures in doctor best-effort
		}
	} catch (e) {
		checks.push({ name: 'resolve_connector', ok: false, info: (e as Error).message })
	}

	const okCount = checks.filter(c => c.ok).length
	const text = [
		`# Doctor`,
		'',
		`通过 ${okCount}/${checks.length} 项检查`,
		'',
		...checks.map(c => `- ${c.ok ? '✅' : '❌'} ${c.name}${c.info ? `：${c.info}` : ''}`)
	].join('\n')
	return { text, evidence: report }
} 