/**
 * Seleção do arquivo a importar — FR-100.
 *
 * `<input type="file">` é o único caminho que funciona offline em toda
 * plataforma-alvo, inclusive no Safari instalado pela Tela de Início.
 */
import { useRef } from 'react'
import { Botao } from '../../ui/Botao'
import estilos from './backup.module.css'

type Props = {
  aoEscolher: (arquivo: File) => void
  desabilitado?: boolean
}

export function SelecionarArquivo({ aoEscolher, desabilitado = false }: Props) {
  const entrada = useRef<HTMLInputElement>(null)

  return (
    <>
      <input
        ref={entrada}
        className={estilos.entradaArquivo}
        type="file"
        accept="application/json,.json"
        aria-hidden="true"
        tabIndex={-1}
        onChange={(evento) => {
          const arquivo = evento.target.files?.[0]
          // Zerar o valor permite reescolher o mesmo arquivo depois de uma
          // recusa — sem isso o `change` não dispara na segunda vez.
          evento.target.value = ''
          if (arquivo) aoEscolher(arquivo)
        }}
      />
      <Botao
        variante="secundario"
        disabled={desabilitado}
        onClick={() => entrada.current?.click()}
      >
        Escolher arquivo de backup
      </Botao>
    </>
  )
}
