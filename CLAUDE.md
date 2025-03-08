# CLAUDE.md - Guide for Development with imark

## Build & Test Commands
- `deno task dev` - Run development server
- `deno task test` - Run all tests
- `deno test -A src/commands/caption.test.ts` - Run specific test
- `deno task check` - Type check all code
- `deno task lint` - Lint code
- `deno task fmt` - Format code
- `deno task check-all` - Run all checks (check, lint, fmt, test)

## Code Style Guidelines
- **Types**: Use strong typing with explicit annotations for parameters and returns
- **Naming**: camelCase for functions/variables, PascalCase for classes/types, ALL_CAPS for constants
- **Functions**: Small, focused with descriptive names indicating action
- **Error Handling**: Try/catch with proper type narrowing, descriptive messages
- **Testing**: Use both Deno.test and BDD style (@std/testing/bdd)
- **Documentation**: JSDoc comments for public APIs
- **Formatting**: 100 char line width, 2 space indent, double quotes

## Project Structure
- `/src/commands/` - CLI commands
- `/src/utils/` - Shared utilities
- `.test.ts` files alongside implementation