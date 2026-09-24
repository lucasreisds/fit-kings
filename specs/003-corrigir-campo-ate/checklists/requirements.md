# Specification Quality Checklist: Corrigir o campo "até" do intervalo de repetições

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-09-23
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

## Notas da validação

**A especificação foi escrita depois da investigação, não antes.** A causa já era conhecida quando
ela foi redigida, e isso muda o que ela precisa dizer: o texto descreve o **efeito sobre o usuário**
e o que a correção deve garantir, sem nomear arquivo nem função. A causa técnica pertence ao plano.

**A User Story 2 existe por uma razão que não é óbvia.** Corrigir o campo faria o defeito parar de
acontecer, e pareceria suficiente. Não é: durante o período em que ele existiu, valores foram
gravados sem que ninguém os visse. Esses valores continuam lá depois da correção, e mudam a
avaliação de aumento de carga do exercício. A história existe para que o usuário **veja** o que foi
gravado e decida.

**A User Story 3 é a mais importante para o projeto, e a menos visível para o usuário.** O defeito
atravessou 554 testes sem ser detectado porque a suíte testava as duas pontas — o componente do
campo e a regra de domínio — e nenhum teste percorria o caminho entre elas. Corrigir só o campo
deixaria a mesma classe de defeito livre para reaparecer em qualquer campo futuro, com a mesma
invisibilidade.

**Uma decisão registrada em Assumptions merece destaque**: não há migração automática dos valores
gravados durante o defeito. Apagá-los removeria junto os intervalos que o usuário gravou de
propósito, e não há como distinguir uns dos outros. Torná-los visíveis e deixar a decisão com ele é
o que respeita o Princípio I.

**Nenhum marcador [NEEDS CLARIFICATION] foi necessário.** O relato veio com o sintoma exato, e a
investigação fechou o resto.
