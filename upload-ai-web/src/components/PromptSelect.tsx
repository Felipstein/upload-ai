import { useEffect, useState } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select'
import { api } from '@/lib/axios'
import { LoaderIcon } from './LoaderIcon'

interface Prompt {
  id: string
  title: string
  template: string
}

export interface PromptSelectProps {
  onPromptSelect: (template: string) => void
}

export function PromptSelect({ onPromptSelect }: PromptSelectProps) {
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [isLoadingPrompts, setIsLoadingPrompts] = useState(false)

  useEffect(() => {
    async function fetchPrompts() {
      try {
        setIsLoadingPrompts(true)

        const response = await api.get('prompts')

        setPrompts(response.data)
      } finally {
        setIsLoadingPrompts(false)
      }
    }

    fetchPrompts()
  }, [])

  function handlePromptSelect(promptId: string) {
    const selectedPrompt = prompts.find((prompt) => prompt.id === promptId)

    if (!selectedPrompt) {
      return
    }

    onPromptSelect(selectedPrompt.template)
  }

  return (
    <Select disabled={isLoadingPrompts} onValueChange={handlePromptSelect}>
      <SelectTrigger>
        <SelectValue
          placeholder={
            isLoadingPrompts ? (
              <div className="flex items-center gap-1">
                <LoaderIcon className="w-3 h-3" />

                <span>Buscando prompts...</span>
              </div>
            ) : (
              'Selecione um prompt...'
            )
          }
        />
      </SelectTrigger>

      <SelectContent>
        {prompts.map((prompt) => (
          <SelectItem key={prompt.id} value={prompt.id}>
            {prompt.title}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
