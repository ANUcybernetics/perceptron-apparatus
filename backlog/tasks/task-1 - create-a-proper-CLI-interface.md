---
id: task-1
title: create a proper CLI interface
status: To Do
assignee: []
created_date: "2025-07-14"
labels: []
dependencies: []
---

## Description

This project will primarily be used as a CLI: provide a "board config" (e.g.
layer sizes) and generate an svg file as output. It's fine if it's not a
portable CLI, it can always be run from this project directory (although it'd be
nice if the output file could take a full path).

I'm not 100% sure what the best practice way to create a CLI for an Ash app is.
Does Ash have a CLI part? Or would it play nicely with a different Elixir CLI
approach like Owl?
