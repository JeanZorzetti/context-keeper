# Project Context

<!-- context-keeper:start (last updated: 2026-06-06T17:42:07.610Z) -->
## Architectural Decisions (auto-captured)

- [2026-06-06] decided to use DecisionEntry interface because it aligns with MCP canonical types
- [2026-06-06] chose DecisionIndex interface over custom implementation because it provides a standard structure
- [2026-06-06] decided to use version: 1 because it ensures consistency across the system
- [2026-06-06] chose to derive projectName from projectPath basename because it provides a clear and consistent naming convention
- [2026-06-06] decided to use decisions array instead of entries because it improves code readability and maintainability
- [2026-06-06] chose to update readIndex() to use decisions key because it ensures data consistency
- [2026-06-06] decided to update appendToIndex() to use decisions array because it improves code efficiency
- [2026-06-06] chose to set version to 1 because it ensures consistency across the system
- [2026-06-06] decided to update tests to use decisions key because it improves test accuracy
- [2026-06-06] chose to use task_create_from_message because it provides a reliable provenance

<!-- context-keeper:end -->
