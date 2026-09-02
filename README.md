# ModelSetupHub — WebApp

**A local web dashboard for setting up, running and measuring AI models on your own machine.**

English · [فارسی](README.fa.md)

WebApp is the graphical front end of ModelSetupHub. It runs on your own computer, in your own browser, and puts the whole
toolkit on one page: inspect your hardware, control the Ollama service, manage your local models, and compare generation
settings against each other to see which is actually faster. Nothing is decided for you — you pick the model, the
parameters and the order of operations.

![System tab](docs/screenshots/system.png)

## Where this fits

ModelSetupHub is three repositories over one engine.

| Repository | What it is | Reach for it when |
| --- | --- | --- |
| [Core](https://github.com/ModelSetupHub/Core) | The Python library that does the work | You are writing your own scripts or automation |
| **WebApp** (this one) | A local web dashboard over the same functions | You want a graphical interface and full manual control |
| [MCPServer](https://github.com/ModelSetupHub/MCPServer) | An MCP server that hands the same tools to an AI agent | You would rather describe the goal in plain language |

This dashboard assumes you already know what you want to do — it is faster and more precise for that, but it expects you
to know what a context window or a GPU layer count means. If you are not sure which model fits your hardware or which
parameter to change, the MCP server is the friendlier way in. Both drive the identical library, so they can be used
interchangeably on the same machine.

## What the dashboard does

One page, four tabs down the side, in the order you tend to need them. The interface is available in English and Persian,
with full right-to-left layout.

### System

A full hardware scan: processor, memory modules, graphics cards with their VRAM, disks with usage bars, and operating
system details. Start here — the VRAM figure is what decides which models you can actually load. A scan takes a few
seconds, so the result is kept and reused; press **Rescan** when you want a fresh one.

### Ollama

![Ollama tab](docs/screenshots/ollama.png)

Installation state and the local server process in one place: start it, stop it, read its version, and install Ollama
from an installer sitting on the machine.

One behaviour worth knowing: on Windows the Ollama desktop app supervises the server and restarts it immediately after a
stop. When that happens the page says so plainly rather than claiming a stop that did not stick — quit Ollama from the
system tray if you need it to stay down.

### Models

![Models tab](docs/screenshots/models.png)

The installed list and the in-memory list, each row offering info, load, stop and remove. Below them are forms to run a
single prompt, load a model with a keep-alive window, register a local GGUF file, and create a configured copy of an
existing model. That last one writes a **new model to disk** and leaves the original untouched. Removing a model cannot
be undone, so it asks first.

Every action reports itself in three places at once: the output panel keeps the full text result, a toast tracks progress
in the corner, and the button you pressed shows a spinner.

### Benchmark

This is the headline feature. It runs the same prompts through one model under several different parameter sets and
compares what each one cost, so you can decide which configuration to keep.

**Choose a target.** Pick the model, then write your prompts — separated by a blank line, which keeps a multi-line prompt
intact while still allowing several of them. Every configuration runs all of the prompts, and the model is preloaded
before each one so load time never lands in the timings.

**Build the configurations.** Either by hand, through a form covering 23 generation options grouped into Sampling,
Context and output, Repetition, Mirostat and Runtime — an empty field means "leave the model's default alone" and is
never sent. Or from a file: drop a `.json` file on the page, browse for one, or paste the text. It is checked on the
server and previewed before anything is applied, because a file may carry its own model and prompts and those should not
silently overwrite what you typed. **Export setup** writes your current model, prompts and configurations back out as a
file you can reload later.

![Manual configuration form](docs/screenshots/benchmark-builder.png)

![Configuration import](docs/screenshots/benchmark-import.png)

Each configuration can be edited, duplicated or removed. Duplicating is how you build a variant: keep everything, change
one option. That is also the advice for getting meaningful numbers — fix the seed so runs are repeatable, and vary one
parameter at a time. If two configurations differ in several places you cannot attribute the difference to any one of
them.

**Run and read the result.** A comparison takes minutes, so it runs on the server and the page follows along; reloading
the browser does not lose a run in progress. Only one comparison runs at a time, because two would contend for the same
GPU and make every timing in both meaningless.

The result leads with the verdict: which configuration generated fastest, and by how much over the runner-up. Then three
bar blocks — output speed, prompt speed and response time — each scaled against the best value in its own block, a
summary table with the winning value in each column highlighted, and a collapsible detail per configuration with
per-prompt timings and, if you asked to keep it, the generated text itself.

![Benchmark results](docs/screenshots/benchmark-results.png)

A prompt that failed is reported rather than hidden: the row says how many failed and the detail carries the error text
straight from Ollama, which is usually what you need — an out-of-memory on startup, a CUDA initialisation failure, and so
on.

## Requirements

- Python 3.10 or newer
- Windows for the full hardware scan, which relies on PowerShell and WMI
- Git, to fetch the `core` submodule

Dependencies are pinned in `requirements.txt`. The toolkit itself comes from the `core` submodule and brings its own.

## Setup

`core` is a git submodule, not a copy of the code, and it has to be installed as a package before the app can import it.
Both steps are required.

```bash
# 1. clone with the submodule
git clone --recurse-submodules https://github.com/ModelSetupHub/WebApp.git
cd WebApp

# already cloned without --recurse-submodules? fetch it now:
git submodule update --init --recursive
```

```bash
# 2. a virtual environment is recommended
python -m venv .venv
.venv\Scripts\activate            # PowerShell / cmd
# source .venv/Scripts/activate   # Git Bash on Windows
```

```bash
# 3. install the core submodule as a package, then the web dependencies
pip install -e ./core
pip install -r requirements.txt
```

```bash
# 4. run it
python app.py
```

Then open <http://127.0.0.1:5000/>.

The `pip install -e ./core` step is the one that is easy to miss. Without it every request fails with
`ModuleNotFoundError: No module named 'MSHCore'`, because the app imports the submodule by package name rather than by
file path.

## Good to know

- **There is no authentication.** This is a local development server, and its endpoints start Ollama, load and remove
  models, and execute installers on the host. Keep it on localhost — do not bind it to a network interface or put it
  behind a public reverse proxy as it stands.
- **Two things live in the server process rather than on disk:** the cached hardware scan and the benchmark run in
  progress. Restarting the server discards both.
- **Configurations you build in the Benchmark tab live in the browser page.** Use **Export setup** if you want to keep
  them.
- **Removing a model is not recoverable** from this interface.

## Status and licence

Early but working, and under active development. Issues and pull requests are welcome — behaviour changes usually belong
in [Core](https://github.com/ModelSetupHub/Core), since this dashboard only calls into it.

No licence file has been added yet. If you need one before using this in your own project, open an issue.
