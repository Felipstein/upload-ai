import { FastifyInstance } from 'fastify'
import { createReadStream } from 'fs'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { openai } from '../lib/openai'

const paramsSchema = z.object({
  videoId: z.string().uuid(),
})

const bodySchema = z.object({
  prompt: z.string(),
})

export async function createTranscriptionRoute(app: FastifyInstance) {
  app.post('/videos/:videoId/transcription', async (req) => {
    const { videoId } = paramsSchema.parse(req.params)

    const { prompt } = bodySchema.parse(req.body)

    const video = await prisma.video.findUniqueOrThrow({
      where: {
        id: videoId,
      },
    })

    const videoPath = video.path

    const audioReadStream = createReadStream(videoPath)

    let transcription: string

    if (process.env.FAKE_TRANSCRIPTION) {
      console.info('Using fake transcription')

      transcription =
        'Uma das primeiras coisas que eu gosto de fazer nos meus projetos, quando eu vou codar o front-end e o back-end do projeto, é começar pelos contratos. Os contratos, eles basicamente definem como que vai funcionar a comunicação entre front-end e back-end. Então, por exemplo, eu gosto de começar criando um pacote, nesse caso aqui eu tenho um monorepo que tem os contratos, e tem o back-end e o front-end separados, e nos contratos aqui eu basicamente crio vários arquivos que eles possuem a definição de tipos, a estrutura de dados que vai percorrer entre back-end e front-end. Então, eu gosto bastante de utilizar os odds, nesse caso, para criar o esquema, então, por exemplo, de todos os parâmetros que cada rota da minha aplicação pode receber, qual é o tipo de resposta, e tem casos mais complexos também, onde a gente tem, por exemplo, query params, que são os search params, nós temos headers também, então no caso aqui, por exemplo, o send message, então eu posso retornar os headers também, e com esses contratos definidos, depois, quando eu for criar alguma rota na minha aplicação, eu simplesmente utilizo destes contratos, ou do Zod, ali do esquema do Zod, para validar que o meu controller, que é a minha rota, está recebendo exatamente os dados naquele formato, e retornando também os dados no formato que eu espero que ele retorne. Então, isso aqui é sensacional para quem vai desenvolver o front-end e o back-end separados e depois quer conectar tudo junto, e funciona super bem em todos os projetos.'
    } else {
      const response = await openai.audio.transcriptions.create({
        file: audioReadStream,
        model: 'whisper-1',
        language: 'pt',
        response_format: 'json',
        temperature: 0,
        prompt,
      })

      transcription = response.text
    }

    await prisma.video.update({
      where: {
        id: videoId,
      },
      data: {
        transcription,
      },
    })

    return { transcription }
  })
}
