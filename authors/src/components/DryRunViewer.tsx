/**
 * DryRunViewer — Interactive dry run result viewer.
 *
 * Shows the chapter list from a dry run, lets the author:
 *   - Expand each chapter to see captured metadata
 *   - Flag headings as skip / recap / appendix (first occurrence only)
 *   - Review the accumulated extra lists at the bottom
 *   - Save classifications + Approve in one action
 */

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, ChevronRight, CheckCircle, AlertCircle } from 'lucide-react'
import api from '../lib/api'

// ── Types ─────────────────────────────────────────────────────────────────────

interface DryRunChapter {
  index: number | null
  heading: string
  type: string
  part: string
  words: number
  sub_chunks: number
  date: string
  location: string
  region: string
}

interface DryRunResult {
  total_chapters: number
  total_skipped: number
  chapters: DryRunChapter[]
}

interface Book {
  id: string
  dry_run_result: string | null
  skip_headings_extra: string | null
  recap_headings_extra: string | null
  appendix_headings_extra: string | null
}

interface Props {
  book: Book
  universeId: string
  workspaceId: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseJson(s: string | null): string[] {
  if (!s) return []
  try { return JSON.parse(s) } catch { return [] }
}

const TYPE_COLOR: Record<string, string> = {
  narrative: 'text-green-400',
  recap:     'text-cyan-400',
  appendix:  'text-yellow-400',
  skip:      'text-red-400',
}

const TYPE_BG: Record<string, string> = {
  narrative: 'bg-green-900/30 border-green-800/40',
  recap:     'bg-cyan-900/30 border-cyan-800/40',
  appendix:  'bg-yellow-900/30 border-yellow-800/40',
  skip:      'bg-red-900/30 border-red-800/40',
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function DryRunViewer({ book, universeId, workspaceId }: Props) {
  const queryClient = useQueryClient()

  const result: DryRunResult = JSON.parse(book.dry_run_result!)

  // Build sets from existing extra lists (pre-populate from saved book metadata)
  const [skipExtra,    setSkipExtra]    = useState<Set<string>>(() => new Set(parseJson(book.skip_headings_extra)))
  const [recapExtra,   setRecapExtra]   = useState<Set<string>>(() => new Set(parseJson(book.recap_headings_extra)))
  const [appendixExtra, setAppendixExtra] = useState<Set<string>>(() => new Set(parseJson(book.appendix_headings_extra)))

  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [saveError, setSaveError] = useState('')

  // Track which headings we've already shown classification buttons for
  const seenHeadings = new Set<string>()

  function toggleExpand(key: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  function toggle(set: Set<string>, setFn: (s: Set<string>) => void, heading: string) {
    const next = new Set(set)
    next.has(heading) ? next.delete(heading) : next.add(heading)
    setFn(next)
  }

  function classifyAs(category: 'skip' | 'recap' | 'appendix', heading: string) {
    // Remove from other two, toggle in target
    const sets = { skip: [skipExtra, setSkipExtra], recap: [recapExtra, setRecapExtra], appendix: [appendixExtra, setAppendixExtra] } as const
    for (const [key, [s, setFn]] of Object.entries(sets) as any[]) {
      if (key === category) {
        toggle(s, setFn, heading)
      } else {
        if ((s as Set<string>).has(heading)) {
          const next = new Set(s as Set<string>)
          next.delete(heading)
          setFn(next)
        }
      }
    }
  }

  function headingCategory(heading: string): 'skip' | 'recap' | 'appendix' | null {
    if (skipExtra.has(heading))    return 'skip'
    if (recapExtra.has(heading))   return 'recap'
    if (appendixExtra.has(heading)) return 'appendix'
    return null
  }

  // Save classifications + approve
  const saveAndApproveMutation = useMutation({
    mutationFn: async () => {
      // PATCH book with updated extra lists
      await api.patch(
        `/universes/${universeId}/workspaces/${workspaceId}/books/${book.id}`,
        {
          skip_headings_extra:    [...skipExtra],
          recap_headings_extra:   [...recapExtra],
          appendix_headings_extra: [...appendixExtra],
        }
      )
      // Trigger chunking
      await api.post(
        `/universes/${universeId}/workspaces/${workspaceId}/books/${book.id}/approve`
      )
    },
    onSuccess: () => {
      setSaveError('')
      queryClient.invalidateQueries({ queryKey: ['books', workspaceId] })
    },
    onError: (err: any) => {
      const detail = err.response?.data?.detail
      setSaveError(Array.isArray(detail) ? detail.map((d: any) => d.msg).join(', ') : detail ?? 'Something went wrong')
    },
  })

  const [saved, setSaved] = useState(false)

  // Save classifications only (without approving)
  const saveMutation = useMutation({
    mutationFn: () =>
      api.patch(
        `/universes/${universeId}/workspaces/${workspaceId}/books/${book.id}`,
        {
          skip_headings_extra:     [...skipExtra],
          recap_headings_extra:    [...recapExtra],
          appendix_headings_extra: [...appendixExtra],
        }
      ),
    onSuccess: () => {
      setSaveError('')
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      queryClient.invalidateQueries({ queryKey: ['books', workspaceId] })
    },
    onError: (err: any) => {
      const detail = err.response?.data?.detail
      setSaveError(Array.isArray(detail) ? detail.map((d: any) => d.msg).join(', ') : detail ?? 'Something went wrong')
    },
  })

  return (
    <div className="px-4 py-3 bg-gray-950/60 border-t border-gray-800">

      {/* ── Header ── */}
      <div className="flex items-center gap-4 mb-3">
        <span className="text-yellow-400 text-xs font-semibold">Dry Run Complete</span>
        <span className="text-xs text-gray-400">{result.total_chapters} chapters</span>
        {result.total_skipped > 0 && (
          <span className="text-xs text-gray-500">{result.total_skipped} skipped</span>
        )}
        <span className="text-xs text-gray-600">Classify headings, then approve to begin chunking</span>
      </div>

      {/* ── Chapter list ── */}
      <div className="max-h-72 overflow-y-auto border border-gray-800 rounded-lg mb-3">
        {result.chapters.map((ch, i) => {
          const isFirstOccurrence = !seenHeadings.has(ch.heading)
          if (isFirstOccurrence) seenHeadings.add(ch.heading)

          const rowKey = `${ch.heading}-${i}`
          const isExpanded = expanded.has(rowKey)
          const category = headingCategory(ch.heading)

          // Effective display type: parser type unless overridden by extra list
          const effectiveType = category ?? ch.type
          const hasMetadata = ch.date || ch.location || ch.part || ch.sub_chunks > 1

          return (
            <div key={rowKey} className={`border-b border-gray-800/50 last:border-0 ${category ? TYPE_BG[category] : ''}`}>
              <div
                className="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-white/5 transition-colors"
                onClick={() => hasMetadata && toggleExpand(rowKey)}
              >
                {/* Expand toggle */}
                <span className="w-3 shrink-0 text-gray-600">
                  {hasMetadata
                    ? (isExpanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />)
                    : null
                  }
                </span>

                {/* Type */}
                <span className={`w-16 shrink-0 text-xs font-mono ${TYPE_COLOR[effectiveType] ?? 'text-gray-400'}`}>
                  {effectiveType}
                </span>

                {/* Index */}
                {ch.index != null && (
                  <span className="text-gray-600 text-xs font-mono w-6 shrink-0">#{ch.index}</span>
                )}

                {/* Heading */}
                <span className="text-gray-300 text-xs flex-1 truncate">{ch.heading}</span>

                {/* Sub-chunk indicator */}
                {ch.sub_chunks > 1 && (
                  <span className="text-gray-600 text-xs shrink-0">{ch.sub_chunks} parts</span>
                )}

                {/* Word count */}
                {ch.words > 0 && (
                  <span className="text-gray-600 text-xs font-mono shrink-0 w-12 text-right">{ch.words}w</span>
                )}

                {/* Classification buttons — first occurrence only */}
                {isFirstOccurrence && ch.type !== 'skip' && (
                  <div
                    className="flex gap-1 shrink-0 ml-2"
                    onClick={e => e.stopPropagation()}
                  >
                    <button
                      onClick={() => classifyAs('skip', ch.heading)}
                      className={`px-1.5 py-0.5 text-xs rounded border transition-colors ${
                        category === 'skip'
                          ? 'bg-red-800 border-red-600 text-red-200'
                          : 'border-gray-700 text-gray-500 hover:border-red-700 hover:text-red-400'
                      }`}
                      title="Skip this heading"
                    >S</button>
                    <button
                      onClick={() => classifyAs('recap', ch.heading)}
                      className={`px-1.5 py-0.5 text-xs rounded border transition-colors ${
                        category === 'recap'
                          ? 'bg-cyan-800 border-cyan-600 text-cyan-200'
                          : 'border-gray-700 text-gray-500 hover:border-cyan-700 hover:text-cyan-400'
                      }`}
                      title="Mark as recap"
                    >R</button>
                    <button
                      onClick={() => classifyAs('appendix', ch.heading)}
                      className={`px-1.5 py-0.5 text-xs rounded border transition-colors ${
                        category === 'appendix'
                          ? 'bg-yellow-800 border-yellow-600 text-yellow-200'
                          : 'border-gray-700 text-gray-500 hover:border-yellow-700 hover:text-yellow-400'
                      }`}
                      title="Mark as appendix"
                    >A</button>
                  </div>
                )}
              </div>

              {/* Expanded metadata */}
              {isExpanded && (
                <div className="px-10 py-2 border-t border-gray-800/40 grid grid-cols-2 gap-x-6 gap-y-1">
                  {ch.part     && <div className="text-xs"><span className="text-gray-500">Part: </span><span className="text-gray-300">{ch.part}</span></div>}
                  {ch.date     && <div className="text-xs"><span className="text-gray-500">Date: </span><span className="text-gray-300">{ch.date}</span></div>}
                  {ch.location && <div className="text-xs col-span-2"><span className="text-gray-500">Location: </span><span className="text-gray-300">{ch.location}</span></div>}
                  {ch.region   && <div className="text-xs col-span-2"><span className="text-gray-500">Region: </span><span className="text-gray-300">{ch.region}</span></div>}
                  {ch.sub_chunks > 1 && <div className="text-xs"><span className="text-gray-500">Sub-chunks: </span><span className="text-gray-300">{ch.sub_chunks}</span></div>}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Classification summary ── */}
      {(skipExtra.size > 0 || recapExtra.size > 0 || appendixExtra.size > 0) && (
        <div className="grid grid-cols-3 gap-3 mb-3 text-xs">
          {[
            { label: 'Skip', set: skipExtra, color: 'text-red-400', border: 'border-red-900/50' },
            { label: 'Recap', set: recapExtra, color: 'text-cyan-400', border: 'border-cyan-900/50' },
            { label: 'Appendix', set: appendixExtra, color: 'text-yellow-400', border: 'border-yellow-900/50' },
          ].map(({ label, set, color, border }) => set.size > 0 && (
            <div key={label} className={`border ${border} rounded p-2`}>
              <div className={`font-semibold mb-1 ${color}`}>{label}</div>
              {[...set].map(h => (
                <div key={h} className="text-gray-400 font-mono truncate">{h}</div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* ── Actions ── */}
      {saveError && (
        <div className="flex items-center gap-1.5 text-xs text-red-400 mb-2">
          <AlertCircle size={12} />
          {saveError}
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || saveAndApproveMutation.isPending}
          className={`px-3 py-1.5 text-xs border rounded transition-colors disabled:opacity-40 ${
            saved
              ? 'border-green-700 text-green-400'
              : 'border-gray-700 text-gray-400 hover:text-white hover:border-gray-500'
          }`}
        >
          {saveMutation.isPending ? 'Saving...' : saved ? '✓ Saved' : 'Save classifications'}
        </button>
        <button
          onClick={() => saveAndApproveMutation.mutate()}
          disabled={saveMutation.isPending || saveAndApproveMutation.isPending}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-green-700 hover:bg-green-600 text-white rounded transition-colors disabled:opacity-40"
        >
          <CheckCircle size={12} />
          {saveAndApproveMutation.isPending ? 'Starting...' : 'Save & Approve'}
        </button>
        <span className="text-xs text-gray-600 ml-1">Approve begins chunking</span>
      </div>
    </div>
  )
}