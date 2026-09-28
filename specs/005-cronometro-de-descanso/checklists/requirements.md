# Specification Quality Checklist: Campo de carga apagável e cronômetro de descanso

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-09-27
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
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Notes

Duas decisões que seriam `[NEEDS CLARIFICATION]` foram resolvidas com o usuário antes de escrever a
especificação, e por isso não aparecem marcadas:

1. **Como avisar o fim do descanso.** Escolhido som curto mais aviso visual, com o aplicativo
   aberto. A alternativa — notificação do sistema, que alcançaria a tela bloqueada — exigiria Web
   Push, e portanto um servidor, quebrando a Autonomia Local (Princípio III). Está em FR-184 e na
   User Story 4, cenário 3, que diz por escrito o que o usuário **não** vai receber.

2. **Se a contagem começa sozinha ao confirmar uma série.** Escolhido não. É o que separa esta
   feature da proibição que FR-151 registrava, e está em FR-173.

**Uma nota sobre FR-169.** Confirmar com o campo apagado registra a série sem carga. É a leitura
fiel do que está na tela, mas é uma mudança de significado: hoje o campo nunca fica vazio, então
essa situação não existe. A alternativa — reaplicar o valor herdado ao confirmar — faria o
aplicativo gravar um número que o usuário tinha acabado de apagar, que é o defeito da 0.2.2 de
novo, por outro caminho.
