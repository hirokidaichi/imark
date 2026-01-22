# CLAUDE.md - Guide for Development with imark

## Build & Test Commands
- `npm run dev -- <command>` - Run development server
- `npm test` - Run all tests
- `npm test -- src/utils/file.test.ts` - Run specific test
- `npm run check` - Type check all code
- `npm run build` - Build for production

## Code Style Guidelines
- **Types**: Use strong typing with explicit annotations for parameters and returns
- **Naming**: camelCase for functions/variables, PascalCase for classes/types, ALL_CAPS for constants
- **Functions**: Small, focused with descriptive names indicating action
- **Error Handling**: Try/catch with proper type narrowing, descriptive messages
- **Testing**: Use vitest with describe/it/expect
- **Documentation**: JSDoc comments for public APIs
- **Formatting**: 100 char line width, 2 space indent, double quotes

## Project Structure
- `/src/commands/` - CLI commands
- `/src/utils/` - Shared utilities
- `.test.ts` files alongside implementation
