import { Label } from '@radix-ui/react-label'
import { Separator } from '@radix-ui/react-separator'
import { CheckCircle, FileVideo, Upload } from 'lucide-react'
import { Button } from './ui/button'
import { Textarea } from './ui/textarea'
import { ChangeEvent, FormEvent, useMemo, useState } from 'react'
import { getFFmpeg } from '@/lib/ffmpeg'
import { fetchFile } from '@ffmpeg/util'
import { api } from '@/lib/axios'
import { Progress } from './ui/progress'
import { LoaderIcon } from './LoaderIcon'

type Status = 'waiting' | 'converting' | 'uploading' | 'generating' | 'success'

const statusMessages: Record<Status, string> = {
  converting: 'Convertendo...',
  generating: 'Transcrevendo...',
  uploading: 'Carregando...',
  success: 'Sucesso!',
  waiting: 'Carregar vídeo',
}

export interface VideoInputFormProps {
  onVideoUpload: (videoId: string) => void
}

export function VideoInputForm({ onVideoUpload }: VideoInputFormProps) {
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [status, setStatus] = useState<Status>('waiting')
  const [progress, setProgress] = useState(0)

  function handleFileSelected(event: ChangeEvent<HTMLInputElement>) {
    const { files } = event.currentTarget

    if (!files) {
      return
    }

    const selectedFile = files[0]

    setVideoFile(selectedFile)
  }

  async function convertVideoToAudio(video: File) {
    console.log('Convert started.')

    const ffmpeg = await getFFmpeg()

    await ffmpeg.writeFile('input.mp4', await fetchFile(video))

    ffmpeg.on('progress', (progress) => {
      const progressFixed = Math.round(progress.progress * 100)

      setProgress(progressFixed)

      console.log('Convert progress:', `${progressFixed}%`)
    })

    await ffmpeg.exec([
      '-i',
      'input.mp4',
      '-map',
      '0:a',
      '-b:a',
      '20k',
      '-acodec',
      'libmp3lame',
      'output.mp3',
    ])

    const data = await ffmpeg.readFile('output.mp3')

    const audioFileBlob = new Blob([data], { type: 'audio/mpeg' })
    const audioFile = new File([audioFileBlob], 'audio.mp3', {
      type: 'audio/mpeg',
    })

    console.log('Convert finished')

    return audioFile
  }

  async function handleUploadVideo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const prompt = new FormData(event.currentTarget).get('transcription_prompt')

    if (!videoFile || !prompt) {
      return
    }

    setStatus('converting')

    const audioFile = await convertVideoToAudio(videoFile)

    const data = new FormData()

    data.append('file', audioFile)

    console.log('Upload started.')

    setStatus('uploading')

    const response = await api.post('/videos', data, {
      onUploadProgress(progressEvent) {
        const progress = Math.round((progressEvent.progress ?? 0) * 100)

        setProgress(progress)

        console.log('Upload progress:', `${progress}%`)
      },
    })

    console.log('Upload finished.')

    const videoId = response.data.video.id as string

    console.log('Transcription started.')

    setStatus('generating')

    await api.post(`/videos/${videoId}/transcription`, { prompt })

    console.log('Transcription finished.')

    setStatus('success')

    onVideoUpload(videoId)
  }

  const previewURL = useMemo(
    () => videoFile && URL.createObjectURL(videoFile),
    [videoFile],
  )

  return (
    <form onSubmit={handleUploadVideo} className="space-y-6">
      <label
        data-disabled={status !== 'waiting'}
        htmlFor="video"
        className="flex flex-col gap-2 items-center justify-center border rounded-md aspect-video cursor-pointer border-dashed text-sm text-muted-foreground hover:bg-primary-foreground/5 data-[disabled=true]:pointer-events-none"
      >
        {previewURL ? (
          <video
            src={previewURL}
            controls={false}
            className="pointer-events-none"
          />
        ) : (
          <>
            <FileVideo className="w-4 h-4" />
            Selecione um vídeo
          </>
        )}
      </label>

      <input
        type="file"
        id="video"
        accept="video/mp4"
        className="sr-only"
        onChange={handleFileSelected}
      />

      <Separator />

      <div className="space-y-2">
        <Label htmlFor="transcription_prompt">Prompt de transcrição</Label>

        <Textarea
          id="transcription_prompt"
          name="transcription_prompt"
          className="min-h-20 leading-relaxed"
          placeholder="Inclua palavra-chaves mencionadas no vídeo separadas por vírgula (,)"
          disabled={status !== 'waiting'}
        />
      </div>

      <div>
        {(status === 'converting' ||
          status === 'uploading' ||
          status === 'generating') && (
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">
              {statusMessages[status]}
            </span>

            {status !== 'generating' && (
              <span className="text-sm text-muted-foreground">
                {Math.round(progress)}%
              </span>
            )}
          </div>
        )}

        <Button
          type="submit"
          variant={status === 'success' ? 'success' : 'secondary'}
          className="w-full"
          disabled={status !== 'waiting'}
        >
          {status === 'waiting' && (
            <>
              {statusMessages[status]}
              <Upload className="w-4 h-4 ml-2" />
            </>
          )}

          {status === 'converting' && (
            <Progress value={progress} className="w-full" />
          )}

          {status === 'uploading' && (
            <Progress value={progress} className="w-full" />
          )}

          {status === 'generating' && <LoaderIcon />}

          {status === 'success' && (
            <>
              {statusMessages[status]}
              <CheckCircle className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </form>
  )
}
