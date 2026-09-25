# Specification Quality Checklist: Gatilho de progressão na faixa

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-09-24
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Notas da validação

**Esta especificação substitui um requisito, e isso está escrito.** FR-142 deixa de valer e é
trocado por FR-160 e FR-161. Registrar a substituição importa porque FR-142 foi aprovado há três
dias com o texto "no topo é cumprir, não superar" — o histórico da decisão precisa mostrar que ela
foi revista, e por quê.

**A revisão veio de fora do código.** O gatilho foi implementado exatamente como pedido na feature
002: "se eu fizer mais que 8, é motivo de aumentar". Só ao confrontá-lo com o protocolo de dupla
progressão ficou visível que a regra esvaziava o próprio recurso — quem segue uma faixa de 6-8 não
faz 9, então o gatilho nunca dispararia.

É o tipo de defeito que nenhum teste pega: a implementação estava correta em relação à
especificação, e a especificação é que estava errada.

**A não-uniformidade entre faixa e valor único é deliberada**, e a spec a justifica em vez de
escondê-la. Uma regra única — "atingir o máximo indica" — seria mais simples e mudaria a avaliação
de todo o histórico de valor único, que é o que o Princípio I proíbe. Duas prescrições diferentes
merecem gatilhos diferentes, e a seção "A distinção que a correção introduz" explica a semântica de
cada uma.

**A User Story 3 existe para o Princípio V.** Com o gatilho novo, alcançar 8 numa faixa de 6-8 faz
o aviso aparecer — e a comparação ao lado diria apenas "na meta", igual a ter feito 6. O usuário
veria o aviso sem conseguir ligá-lo ao que fez.

**Três coisas ficaram deliberadamente fora**, e estão em Assumptions: sugerir quanto aumentar,
reescrever o planejamento após o aumento, e a progressão de peso direta. As três foram levantadas na
conversa e nenhuma pertence a esta correção.
