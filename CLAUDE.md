## Elixir & Ash/Phoenix coding principles

This is an Elixir app which uses the Ash framework. It doesn't have a web
component at present (although may in future). It's primarily a command-line
application. See @README.md for mroe details.

- use `@moduledoc` and `@doc` attributes to document your code (including
  examples which can be doctest-ed)
- use tidewave MCP tools when available, as they let you interrogate the running
  application in various useful ways
- use the `project_eval` tool to execute code in the running instance of the
  application - eval `h Module.fun` to get documentation for a module or
  function
- use the `package_docs_search` and `get_docs` tools to find the documentation
  for library code
- prefer using LiveView instead of regular Controllers
- once you are done with changes, run `mix compile` and fix any issues
- write tests for your changes and run `mix test` afterwards
- use `ExUnitProperties` for property-based testing and `use Ash.Generator` to
  create seed data for these tests
- in tests, don't require exact matches of error messages - raising the right
  type of error is enough
- use `list_generators` to list available generators when available, otherwise
  `mix help` - if you have to run generator tasks, pass `--yes` and always
  prefer to use generators as a basis for code generation, then modify
  afterwards
- always use Ash concepts, almost never ecto concepts directly - think hard
  about the "Ash way" to do things and look for information in the rules & docs
  of Ash & associated packages if you don't know
- when creating new Ash resources/validations/changes/calculations, use proper
  module-based versions, and use the appropriate generator (e.g.
  `mix ash.gen.resource` or `mix ash.gen.change`) to create the boilerplate
  files
- never attempt to start or stop a phoenix application as your tidewave tools
  work by being connected to the running application, and starting or stopping
  it can cause issues

<!-- usage-rules-start -->
<!-- usage-rules-header -->

# Usage Rules

**IMPORTANT**: Consult these usage rules early and often when working with the
packages listed below. Before attempting to use any of these packages or to
discover if you should use them, review their usage rules to understand the
correct patterns, conventions, and best practices.

<!-- usage-rules-header-end -->

<!-- ash-start -->

## ash usage

_A declarative, extensible framework for building Elixir applications. _

@deps/ash/usage-rules.md

<!-- ash-end -->
<!-- usage_rules:elixir-start -->

## usage_rules:elixir usage

# Elixir Core Usage Rules

## Pattern Matching

- Use pattern matching over conditional logic when possible
- Prefer to match on function heads instead of using `if`/`else` or `case` in
  function bodies

## Error Handling

- Use `{:ok, result}` and `{:error, reason}` tuples for operations that can fail
- Avoid raising exceptions for control flow
- Use `with` for chaining operations that return `{:ok, _}` or `{:error, _}`

## Common Mistakes to Avoid

- Don't use `Enum` functions on large collections when `Stream` is more
  appropriate
- Avoid nested `case` statements - refactor to a single `case`, `with` or
  separate functions
- Don't use `String.to_atom/1` on user input (memory leak risk)
- Lists and enumerables cannot be indexed with brackets. Use pattern matching or
  `Enum` functions
- Prefer `Enum` functions like `Enum.reduce` over recursion
- When recursion is necessary, prefer to use pattern matching in function heads
  for base case detection
- Using the process dictionary is typically a sign of unidiomatic code
- Only use macros if explicitly requested
- There are many useful standard library functions, prefer to use them where
  possible

## Function Design

- Use guard clauses: `when is_binary(name) and byte_size(name) > 0`
- Prefer multiple function clauses over complex conditional logic
- Name functions descriptively: `calculate_total_price/2` not `calc/2`
- Predicate function names should not start with `is` and should end in a
  question mark.
- Names like `is_thing` should be reserved for guards

## Data Structures

- Use structs over maps when the shape is known: `defstruct [:name, :age]`
- Prefer keyword lists for options: `[timeout: 5000, retries: 3]`
- Use maps for dynamic key-value data
- Prefer to prepend to lists `[new | list]` not `list ++ [new]`

## Mix Tasks

- Use `mix help` to list available mix tasks
- Use `mix help task_name` to get docs for an individual task
- Read the docs and options fully before using tasks

## Testing

- Run tests in a specific file with `mix test test/my_test.exs` and a specific
  test with the line number `mix test path/to/test.exs:123`
- Limit the number of failed tests with `mix test --max-failures n`
- Use `@tag` to tag specific tests, and `mix test --only tag` to run only those
  tests
- Use `assert_raise` for testing expected exceptions:
  `assert_raise ArgumentError, fn -> invalid_function() end`

<!-- usage_rules:elixir-end -->
<!-- usage_rules:otp-start -->

## usage_rules:otp usage

# OTP Usage Rules

## GenServer Best Practices

- Keep state simple and serializable
- Handle all expected messages explicitly
- Use `handle_continue/2` for post-init work
- Implement proper cleanup in `terminate/2` when necessary

## Process Communication

- Use `GenServer.call/3` for synchronous requests expecting replies
- Use `GenServer.cast/2` for fire-and-forget messages.
- When in doubt, us `call` over `cast`, to ensure back-pressure
- Set appropriate timeouts for `call/3` operations

## Fault Tolerance

- Set up processes such that they can handle crashing and being restarted by
  supervisors
- Use `:max_restarts` and `:max_seconds` to prevent restart loops

## Task and Async

- Use `Task.Supervisor` for better fault tolerance
- Handle task failures with `Task.yield/2` or `Task.shutdown/2`
- Set appropriate task timeouts
- Use `Task.async_stream/3` for concurrent enumeration with back-pressure

<!-- usage_rules:otp-end -->
<!-- igniter-start -->

## igniter usage

_A code generation and project patching framework _

@deps/igniter/usage-rules.md

<!-- igniter-end -->
<!-- usage-rules-end -->
