// Every string the interface shows, in English and Persian.
//
// An entry with no `fa` falls back to English on purpose. Terms like CPU, GPU,
// RAM, VRAM, CUDA and Ollama are read in their original form by Persian-speaking
// developers, and a literal translation would be less clear than the acronym, so
// those are left alone rather than translated.
//
// Persian text here is written to convey the meaning, not to mirror the English
// word order. Where the English phrasing is idiomatic ("all passed", "not wired
// yet"), the Persian says the same thing the way it would normally be said.
//
// Placeholders are {name} and are filled in by t() / tn().

export const STRINGS = {
  // ---------- Shell and navigation ----------
  // The product name is a brand and is never translated, so it stays a literal
  // in the markup rather than living here.
  "nav.sections": { en: "Sections", fa: "بخش‌ها" },
  "nav.tools": { en: "Tools", fa: "ابزارها" },
  "nav.system": { en: "System", fa: "سیستم" },
  "nav.ollama": { en: "Ollama" },
  "nav.models": { en: "Models", fa: "مدل‌ها" },
  "nav.benchmark": { en: "Benchmark", fa: "بنچمارک" },
  "lang.switch": { en: "Language", fa: "زبان" },
  "sidebar.collapse": { en: "Collapse sidebar", fa: "جمع کردن منو" },
  "sidebar.expand": { en: "Expand sidebar", fa: "باز کردن منو" },

  "host.connecting": { en: "connecting…", fa: "در حال اتصال…" },
  "host.online": { en: "host online", fa: "میزبان متصل است" },
  "host.scanFailed": { en: "scan failed", fa: "اسکن ناموفق" },

  // ---------- Shared ----------
  "btn.refresh": { en: "Refresh", fa: "بازخوانی" },
  "btn.rescan": { en: "Rescan", fa: "اسکن مجدد" },
  "btn.close": { en: "Close", fa: "بستن" },
  "btn.reset": { en: "Reset", fa: "خالی کردن" },
  "btn.save": { en: "Save", fa: "ذخیره" },
  "btn.add": { en: "Add", fa: "افزودن" },
  "btn.check": { en: "Check", fa: "بررسی" },
  "btn.info": { en: "Info", fa: "جزئیات" },
  "btn.load": { en: "Load", fa: "بارگذاری" },
  "btn.stop": { en: "Stop", fa: "توقف" },
  "btn.start": { en: "Start", fa: "اجرا" },
  "btn.remove": { en: "Remove", fa: "حذف" },
  "btn.edit": { en: "Edit", fa: "ویرایش" },
  "btn.duplicate": { en: "Duplicate", fa: "تکثیر" },
  "btn.run": { en: "Run", fa: "اجرا" },
  "btn.create": { en: "Create", fa: "ساختن" },

  "value.yes": { en: "yes", fa: "بله" },
  "value.no": { en: "no", fa: "خیر" },
  "value.running": { en: "running", fa: "در حال اجرا" },
  "value.stopped": { en: "stopped", fa: "متوقف" },
  "value.unknown": { en: "unknown", fa: "نامعلوم" },
  "value.notDetected": { en: "not detected", fa: "شناسایی نشد" },
  "value.statusUnknown": { en: "status unknown", fa: "وضعیت نامعلوم" },

  // ---------- System tab ----------
  "system.title": { en: "System", fa: "سیستم" },
  "system.note": {
    en: "Hardware and software profile reported by the core scanner.",
    fa: "مشخصات سخت‌افزار و نرم‌افزار این دستگاه، بر اساس اسکن core.",
  },
  "system.scanning": { en: "Scanning…", fa: "در حال اسکن…" },
  "system.rescanning": { en: "Rescanning…", fa: "در حال اسکن مجدد…" },
  "system.scannedAt": { en: "Scanned {time}", fa: "اسکن‌شده در {time}" },
  "system.scannedAtCached": {
    en: "Scanned {time} (cached)",
    fa: "اسکن‌شده در {time} (از حافظه)",
  },
  "system.scanFailed": {
    en: "System scan failed — {error}",
    fa: "اسکن سیستم انجام نشد — {error}",
  },
  "system.rescanned": { en: "System rescanned", fa: "سیستم دوباره اسکن شد" },
  "system.rescannedBody": {
    en: "Hardware profile refreshed.",
    fa: "مشخصات سخت‌افزار به‌روز شد.",
  },

  "system.software": { en: "Software", fa: "نرم‌افزار" },
  "system.os": { en: "Operating system", fa: "سیستم عامل" },
  "system.runtime": { en: "Runtime", fa: "محیط اجرا" },
  "system.hardware": { en: "Hardware", fa: "سخت‌افزار" },
  "system.processor": { en: "Processor", fa: "پردازنده" },
  "system.memory": { en: "Memory", fa: "حافظه" },
  "system.graphics": { en: "Graphics", fa: "گرافیک" },
  "system.storage": { en: "Storage", fa: "فضای ذخیره‌سازی" },

  "card.cpu": { en: "CPU" },
  "card.memory": { en: "Memory", fa: "حافظه" },
  "card.gpu": { en: "GPU" },
  "card.storageFree": { en: "Storage free", fa: "فضای آزاد" },
  "card.memoryInUse": { en: "{n}% in use", fa: "{n}٪ در حال استفاده" },
  "card.acrossDrive": { en: "across 1 drive", fa: "روی 1 درایو" },
  "card.acrossDrives": { en: "across {n} drives", fa: "روی {n} درایو" },

  "spec.name": { en: "Name", fa: "نام" },
  "spec.version": { en: "Version", fa: "نسخه" },
  "spec.build": { en: "Build", fa: "بیلد" },
  "spec.architecture": { en: "Architecture", fa: "معماری" },
  "spec.python": { en: "Python" },
  "spec.cuda": { en: "CUDA" },
  "spec.gpusDetected": { en: "GPUs detected", fa: "تعداد GPU شناسایی‌شده" },
  "spec.model": { en: "Model", fa: "مدل" },
  "spec.physicalCores": { en: "Physical cores", fa: "هسته‌های فیزیکی" },
  "spec.logicalThreads": { en: "Logical threads", fa: "رشته‌های منطقی" },
  "spec.reportedClock": { en: "Reported clock", fa: "فرکانس اعلام‌شده" },
  "spec.currentFrequency": { en: "Current frequency", fa: "فرکانس فعلی" },
  "spec.maxFrequency": { en: "Max frequency", fa: "بیشترین فرکانس" },
  "spec.instructionSets": { en: "Instruction sets", fa: "مجموعه دستورات" },
  "spec.total": { en: "Total", fa: "کل" },
  "spec.used": { en: "Used", fa: "استفاده‌شده" },
  "spec.available": { en: "Available", fa: "قابل استفاده" },
  "spec.free": { en: "Free", fa: "آزاد" },
  "spec.usage": { en: "Usage", fa: "میزان مصرف" },
  "spec.channels": { en: "Channels", fa: "کانال‌ها" },
  "spec.modulesInstalled": { en: "Modules installed", fa: "ماژول‌های نصب‌شده" },
  "spec.capacity": { en: "Capacity", fa: "ظرفیت" },
  "spec.manufacturer": { en: "Manufacturer", fa: "سازنده" },
  "spec.partNumber": { en: "Part number", fa: "شماره قطعه" },
  "spec.ratedSpeed": { en: "Rated speed", fa: "سرعت نامی" },
  "spec.configuredSpeed": { en: "Configured speed", fa: "سرعت تنظیم‌شده" },
  "spec.devicesDetected": { en: "Devices detected", fa: "دستگاه‌های شناسایی‌شده" },
  "spec.cudaVersion": { en: "CUDA version", fa: "نسخه CUDA" },
  "spec.driver": { en: "Driver", fa: "درایور" },
  "spec.vramTotal": { en: "VRAM total", fa: "VRAM کل" },
  "spec.vramUsed": { en: "VRAM used", fa: "VRAM استفاده‌شده" },
  "spec.vramFree": { en: "VRAM free", fa: "VRAM آزاد" },
  "spec.percentUsed": { en: "{n}% used", fa: "{n}٪ پر" },

  "empty.noRamModules": {
    en: "No RAM module details available.",
    fa: "جزئیاتی از ماژول‌های RAM در دسترس نیست.",
  },
  "empty.noGpu": {
    en: "No NVIDIA GPU detected.",
    fa: "هیچ GPU انویدیایی شناسایی نشد.",
  },
  "empty.noDrives": { en: "No drives detected.", fa: "هیچ درایوی شناسایی نشد." },

  // ---------- Ollama tab ----------
  "ollama.title": { en: "Ollama" },
  "ollama.note": {
    en: "Installation state and the local server process.",
    fa: "وضعیت نصب Ollama و پروسه سرور محلی آن.",
  },
  "ollama.checkedAt": { en: "Checked {time}", fa: "بررسی‌شده در {time}" },
  "ollama.statusFailed": {
    en: "Could not read Ollama status — {error}",
    fa: "وضعیت Ollama خوانده نشد — {error}",
  },

  "ollama.cardInstalled": { en: "Installed", fa: "نصب شده" },
  "ollama.cardInstalledYes": {
    en: "binary found on PATH",
    fa: "فایل اجرایی در PATH پیدا شد",
  },
  "ollama.cardInstalledNo": {
    en: "ollama binary not found",
    fa: "فایل اجرایی ollama پیدا نشد",
  },
  "ollama.cardServer": { en: "Server", fa: "سرور" },
  "ollama.cardServerSub": { en: "local API on port 11434", fa: "API محلی روی پورت 11434" },
  "ollama.cardVersion": { en: "Version", fa: "نسخه" },
  "ollama.cardVersionSub": {
    en: "reported by the ollama binary",
    fa: "اعلام‌شده توسط خود ollama",
  },

  "ollama.specInstalled": { en: "Installed", fa: "نصب شده" },
  "ollama.specServerRunning": { en: "Server running", fa: "سرور در حال اجرا" },
  "ollama.specVersion": { en: "Version", fa: "نسخه" },

  "ollama.processControl": { en: "Process control", fa: "کنترل پروسه" },
  "ollama.checking": { en: "Checking the server…", fa: "در حال بررسی سرور…" },
  "ollama.notInstalled": { en: "Ollama is not installed", fa: "Ollama نصب نیست" },
  "ollama.notInstalledNote": {
    en: "Run an installer below before starting the server.",
    fa: "پیش از اجرای سرور، نصب‌کننده را از بخش پایین اجرا کنید.",
  },
  "ollama.serverUp": { en: "Server is running", fa: "سرور در حال اجراست" },
  "ollama.serverUpNote": {
    en: "Models can be listed, loaded and run.",
    fa: "اکنون می‌توانید مدل‌ها را ببینید، بارگذاری کنید و اجرا کنید.",
  },
  "ollama.serverDown": { en: "Server is stopped", fa: "سرور متوقف است" },
  "ollama.serverDownNote": {
    en: "Start the server before using any model action.",
    fa: "برای هر کاری با مدل‌ها، اول سرور را اجرا کنید.",
  },

  "ollama.starting": { en: "Starting Ollama", fa: "اجرای Ollama" },
  "ollama.startedBody": {
    en: "Server running, version {version}.",
    fa: "سرور اجرا شد، نسخه {version}.",
  },
  "ollama.stopping": { en: "Stopping Ollama", fa: "توقف Ollama" },
  "ollama.stoppedBody": { en: "Server stopped.", fa: "سرور متوقف شد." },
  "ollama.stopConfirm": {
    en: "Stop the Ollama server? Any model held in memory will be unloaded.",
    fa: "سرور Ollama متوقف شود؟ هر مدلی که در حافظه است از حافظه خارج می‌شود.",
  },
  "ollama.respawned": {
    en:
      "The server process was terminated but the Ollama desktop app restarted it. " +
      "Quit Ollama from the system tray to keep it stopped.",
    fa:
      "پروسه سرور بسته شد، ولی اپلیکیشن دسکتاپ Ollama بلافاصله آن را دوباره اجرا کرد. " +
      "برای اینکه خاموش بماند، Ollama را از system tray ببندید.",
  },

  "ollama.installation": { en: "Installation", fa: "نصب" },
  "ollama.installFormTitle": {
    en: "Run an Ollama installer",
    fa: "اجرای نصب‌کننده Ollama",
  },
  "ollama.installerPath": { en: "Installer path", fa: "مسیر فایل نصب‌کننده" },
  "ollama.installerHint": {
    en:
      "Absolute path to an installer already downloaded on this machine. The " +
      "installer runs with its own interface, which may ask for elevation and " +
      "may need to be completed outside this page.",
    fa:
      "مسیر کامل نصب‌کننده‌ای که از قبل روی این دستگاه دانلود شده است. نصب‌کننده " +
      "با پنجره خودش اجرا می‌شود، ممکن است دسترسی مدیر بخواهد و لازم باشد مراحلش " +
      "را بیرون از این صفحه کامل کنید.",
  },
  "ollama.runInstaller": { en: "Run installer", fa: "اجرای نصب‌کننده" },
  "ollama.installing": { en: "Running installer", fa: "اجرای نصب‌کننده" },
  "ollama.installedBody": {
    en: "Ollama installed, version {version}.",
    fa: "Ollama نصب شد، نسخه {version}.",
  },
  "ollama.installedNoBinary": {
    en: "The installer finished but no ollama binary was found on PATH yet.",
    fa: "نصب‌کننده تمام شد، ولی هنوز فایل اجرایی ollama در PATH پیدا نمی‌شود.",
  },
  "ollama.cannotInstall": { en: "Cannot install", fa: "نصب انجام نشد" },
  "ollama.cannotInstallBody": {
    en: "Enter the path to an Ollama installer.",
    fa: "مسیر فایل نصب‌کننده Ollama را وارد کنید.",
  },

  // ---------- Models tab ----------
  "models.title": { en: "Models", fa: "مدل‌ها" },
  "models.note": {
    en: "Installed and running Ollama models, and every action core exposes for them.",
    fa: "مدل‌های نصب‌شده و در حال اجرا، همراه با همه کارهایی که core روی آن‌ها انجام می‌دهد.",
  },
  "models.updatedAt": { en: "Updated {time}", fa: "به‌روزشده در {time}" },
  "models.listFailed": {
    en: "Could not list models — {error}",
    fa: "فهرست مدل‌ها خوانده نشد — {error}",
  },

  "models.cardInstalled": { en: "Installed", fa: "نصب‌شده" },
  "models.cardInstalledSub": { en: "models on disk", fa: "مدل روی دیسک" },
  "models.cardLoaded": { en: "Loaded", fa: "در حافظه" },
  "models.cardLoadedSub": {
    en: "models resident in memory",
    fa: "مدل بارگذاری‌شده در حافظه",
  },
  "models.cardServer": { en: "Server", fa: "سرور" },

  "models.runningTitle": { en: "Running models", fa: "مدل‌های در حال اجرا" },
  "models.installedTitle": { en: "Installed models", fa: "مدل‌های نصب‌شده" },
  "models.actionsTitle": { en: "Actions", fa: "عملیات" },
  "models.outputTitle": { en: "Output", fa: "خروجی" },
  "models.noActionYet": { en: "No action run yet.", fa: "هنوز عملیاتی اجرا نشده." },

  "models.emptyNotInstalled": {
    en: "Ollama is not installed, so no models can be listed.",
    fa: "Ollama نصب نیست، پس فهرستی از مدل‌ها وجود ندارد.",
  },
  "models.emptyServerDown": {
    en: "The Ollama server is not running.",
    fa: "سرور Ollama در حال اجرا نیست.",
  },
  "models.emptyNone": { en: "No models installed.", fa: "هیچ مدلی نصب نشده است." },
  "models.emptyNoneLoaded": {
    en: "No model is currently loaded in memory.",
    fa: "در حال حاضر هیچ مدلی در حافظه بارگذاری نشده است.",
  },
  "models.noModelsInSelect": {
    en: "no models installed",
    fa: "مدلی نصب نشده است",
  },

  "models.runTitle": { en: "Run a prompt", fa: "اجرای یک پرامپت" },
  "models.fieldModel": { en: "Model", fa: "مدل" },
  "models.fieldPrompt": { en: "Prompt", fa: "پرامپت" },
  "models.promptPlaceholder": {
    en: "Explain what a GGUF file is.",
    fa: "توضیح بده فایل GGUF چیست.",
  },
  "models.running": { en: "Running {model}", fa: "اجرای {model}" },
  "models.cannotRun": { en: "Cannot run", fa: "اجرا انجام نشد" },
  "models.selectModelFirst": {
    en: "Select a model first.",
    fa: "اول یک مدل انتخاب کنید.",
  },
  "models.enterPromptFirst": {
    en: "Enter a prompt first.",
    fa: "اول یک پرامپت بنویسید.",
  },

  "models.loadTitle": { en: "Load into memory", fa: "بارگذاری در حافظه" },
  "models.fieldKeepAlive": { en: "Keep alive", fa: "مدت ماندن در حافظه" },
  "models.keepAliveHint": {
    en: "How long to hold the model in memory, e.g. 10m or 1h.",
    fa: "مدل چه مدت در حافظه بماند، مثلاً 10m یا 1h.",
  },
  "models.loading": { en: "Loading {model}", fa: "بارگذاری {model}" },
  "models.cannotLoad": { en: "Cannot load", fa: "بارگذاری انجام نشد" },
  "models.alreadyLoaded": {
    en: 'Model "{model}" is already loaded.',
    fa: "مدل «{model}» از قبل در حافظه است.",
  },
  "models.loaded": {
    en: 'Model "{model}" loaded into memory.',
    fa: "مدل «{model}» در حافظه بارگذاری شد.",
  },

  "models.addTitle": { en: "Add a local model file", fa: "افزودن فایل مدل محلی" },
  "models.fieldNewName": { en: "New model name", fa: "نام مدل جدید" },
  "models.fieldModelPath": { en: "Model file path", fa: "مسیر فایل مدل" },
  "models.modelPathHint": {
    en: "Absolute path to a GGUF file on this machine.",
    fa: "مسیر کامل یک فایل GGUF روی این دستگاه.",
  },
  "models.adding": { en: "Adding {model}", fa: "افزودن {model}" },
  "models.added": {
    en: 'Model "{model}" created.',
    fa: "مدل «{model}» ساخته شد.",
  },
  "models.cannotAdd": { en: "Cannot add", fa: "افزودن انجام نشد" },
  "models.cannotAddBody": {
    en: "Both a model name and a file path are required.",
    fa: "هم نام مدل و هم مسیر فایل لازم است.",
  },

  "models.configureTitle": {
    en: "Create a configured copy",
    fa: "ساختن نسخه‌ای با تنظیمات دلخواه",
  },
  "models.fieldSourceModel": { en: "Source model", fa: "مدل مبدأ" },
  "models.configureHint": {
    en: "Blank parameters are omitted. The source model is left untouched.",
    fa: "پارامترهای خالی ارسال نمی‌شوند. مدل مبدأ دست‌نخورده می‌ماند.",
  },
  "models.creating": { en: "Creating {model}", fa: "ساختن {model}" },
  "models.created": {
    en: 'Model "{target}" created from "{source}".',
    fa: "مدل «{target}» بر پایه «{source}» ساخته شد.",
  },
  "models.cannotCreate": { en: "Cannot create", fa: "ساختن انجام نشد" },
  "models.cannotCreateBody": {
    en: "A source model and a new model name are required.",
    fa: "هم مدل مبدأ و هم نام مدل جدید لازم است.",
  },
  "models.needOneParam": {
    en: "Set at least one parameter.",
    fa: "دست‌کم یک پارامتر را مقدار بدهید.",
  },

  "models.reading": { en: "Reading {model}", fa: "خواندن {model}" },
  "models.stopping": { en: "Stopping {model}", fa: "توقف {model}" },
  "models.stopped": {
    en: 'Model "{model}" stopped.',
    fa: "مدل «{model}» متوقف شد.",
  },
  "models.removing": { en: "Removing {model}", fa: "حذف {model}" },
  "models.removed": {
    en: 'Model "{model}" removed.',
    fa: "مدل «{model}» حذف شد.",
  },
  "models.removeConfirm": {
    en: 'Remove "{model}" from local Ollama storage? This cannot be undone.',
    fa: "مدل «{model}» از حافظه محلی Ollama حذف شود؟ این کار قابل بازگشت نیست.",
  },

  // ---------- Benchmark tab ----------
  "bench.title": { en: "Benchmark", fa: "بنچمارک" },
  "bench.note": {
    en:
      "Run the same prompts through one model under several configurations and " +
      "compare what each one costs.",
    fa:
      "پرامپت‌های یکسان را با چند تنظیم مختلف روی یک مدل اجرا کنید و ببینید هر " +
      "تنظیم چه هزینه‌ای دارد.",
  },
  "bench.exportSetup": { en: "Export setup", fa: "دریافت فایل تنظیمات" },

  "bench.step1": { en: "1 · Prompts", fa: "1 · پرامپت‌ها" },
  "bench.modelHint": {
    en:
      "Every configuration is tested against this one model, so differences in " +
      "the results come only from the parameters.",
    fa:
      "همه تنظیم‌ها روی همین یک مدل آزمایش می‌شوند، پس تفاوت نتایج فقط از خود " +
      "پارامترها می‌آید.",
  },
  "bench.prompts": { en: "Prompts", fa: "پرامپت‌ها" },
  "bench.promptsPlaceholder": {
    en:
      "Summarise the difference between RAM and VRAM.\n\n" +
      "Write a Python function that reverses a linked list.",
    fa:
      "تفاوت RAM و VRAM را خلاصه توضیح بده.\n\n" +
      "یک تابع پایتون بنویس که یک linked list را برعکس کند.",
  },
  "bench.promptsHint": {
    en:
      "Separate prompts with a blank line. Every configuration runs all of " +
      "them, and the model is preloaded before each so load time never lands " +
      "in the timings.",
    fa:
      "پرامپت‌ها را با یک خط خالی از هم جدا کنید. هر تنظیم همه آن‌ها را اجرا " +
      "می‌کند و مدل پیش از هر پرامپت بارگذاری می‌شود، تا زمان بارگذاری در " +
      "اندازه‌گیری‌ها نیاید.",
  },

  "bench.step2": { en: "2 · Models", fa: "2 · مدل‌ها" },
  "bench.noModelsYet": { en: "No model selected", fa: "مدلی انتخاب نشده" },
  "bench.modelReady": { en: "1 model selected", fa: "۱ مدل انتخاب شده" },
  "bench.modelsReadyCount": { en: "{n} models selected", fa: "{n} مدل انتخاب شده" },
  "bench.modelsToolbarNote": {
    en:
      "One model measures that model. Two or more compare them against each " +
      "other, one at a time so they never share the GPU.",
    fa:
      "یک مدل، همان مدل را می‌سنجد. دو مدل یا بیشتر با هم مقایسه می‌شوند و " +
      "یکی‌یکی اجرا می‌شوند تا GPU را با هم شریک نشوند.",
  },
  "bench.modelsTooMany": { en: "Too many models", fa: "تعداد مدل زیاد است" },
  "bench.modelsTooManyBody": {
    en: "At most {n} models can be compared in one run.",
    fa: "در هر اجرا حداکثر {n} مدل قابل مقایسه است.",
  },
  "bench.oneModel": { en: "1 model", fa: "۱ مدل" },
  "bench.nModels": { en: "{n} models", fa: "{n} مدل" },

  "bench.step3": { en: "3 · Configurations", fa: "3 · تنظیم‌ها" },
  "bench.noConfigsYet": { en: "No configurations yet", fa: "هنوز تنظیمی اضافه نشده" },
  "bench.configReady": { en: "1 configuration ready", fa: "1 تنظیم آماده است" },
  "bench.configsReady": { en: "{n} configurations ready", fa: "{n} تنظیم آماده است" },
  "bench.toolbarNote": {
    en: "Add them by hand, or upload a configuration file.",
    fa: "دستی وارد کنید، یا یک فایل تنظیمات بارگذاری کنید.",
  },
  "bench.addConfig": { en: "Add configuration", fa: "افزودن تنظیم" },
  "bench.uploadFile": { en: "Upload file", fa: "بارگذاری فایل" },
  "bench.clearAll": { en: "Clear all", fa: "حذف همه" },
  "bench.clearConfirm": {
    en: "Remove every configuration from this comparison?",
    fa: "همه تنظیم‌های این مقایسه حذف شوند؟",
  },
  "bench.emptyConfigList": {
    en: "No configurations yet. Add one by hand, or upload a configuration file.",
    fa: "هنوز تنظیمی اضافه نشده. یکی را دستی وارد کنید یا یک فایل بارگذاری کنید.",
  },
  "bench.modelDefaults": { en: "model defaults", fa: "پیش‌فرض‌های مدل" },

  "bench.importTitle": { en: "Upload configurations", fa: "بارگذاری تنظیم‌ها" },
  "bench.dropzoneText": {
    en: 'Drop a <code>.json</code> file here, or click to choose one',
    fa: 'یک فایل <code>.json</code> را اینجا رها کنید، یا برای انتخاب کلیک کنید',
  },
  "bench.dropzoneHint": {
    en:
      "A whole setup (<code>model</code>, <code>prompts</code>, " +
      "<code>configurations</code>), a list of configurations, or a bare object " +
      "of Ollama options.",
    fa:
      "یک ستاپ کامل (<code>model</code>، <code>prompts</code>، " +
      "<code>configurations</code>)، یک فهرست از تنظیم‌ها، یا فقط یک آبجکت از " +
      "گزینه‌های Ollama.",
  },
  "bench.pasteLabel": {
    en: "…or paste the configuration",
    fa: "…یا تنظیمات را اینجا paste کنید",
  },
  "bench.pasteFirst": {
    en: "Paste a configuration first.",
    fa: "اول یک تنظیم را paste کنید.",
  },
  "bench.pastedText": { en: "pasted text", fa: "متن paste‌شده" },
  "bench.importUnreadable": {
    en: "This file could not be read",
    fa: "این فایل خوانده نشد",
  },
  "bench.foundConfig": { en: "1 configuration found", fa: "1 تنظیم پیدا شد" },
  "bench.foundConfigs": { en: "{n} configurations found", fa: "{n} تنظیم پیدا شد" },
  "bench.alsoCarries": {
    en: "also carries {extras}",
    fa: "این فایل {extras} هم دارد",
  },
  "bench.extraModel": { en: 'model "{model}"', fa: "مدل «{model}»" },
  "bench.extraPrompt": { en: "1 prompt", fa: "1 پرامپت" },
  "bench.extraPrompts": { en: "{n} prompts", fa: "{n} پرامپت" },
  "bench.and": { en: " and ", fa: " و " },
  "bench.replaceExisting": { en: "Replace existing", fa: "جایگزینی همه" },
  "bench.addToList": { en: "Add to list", fa: "افزودن به فهرست" },
  "bench.configsReplaced": { en: "Configurations replaced", fa: "تنظیم‌ها جایگزین شدند" },
  "bench.configsAdded": { en: "Configurations added", fa: "تنظیم‌ها اضافه شدند" },
  "bench.nowInComparison": {
    en: "{n} configuration(s) now in the comparison.",
    fa: "الان {n} تنظیم در این مقایسه هست.",
  },

  "bench.editorAdd": { en: "Add a configuration", fa: "افزودن یک تنظیم" },
  "bench.editorEdit": { en: 'Edit "{name}"', fa: "ویرایش «{name}»" },
  "bench.fieldName": { en: "Name", fa: "نام" },
  "bench.nameHint": {
    en: "Shown in the results table. Left blank, it is numbered for you.",
    fa: "در جدول نتایج نشان داده می‌شود. اگر خالی بماند، خودش شماره می‌گیرد.",
  },
  "bench.optionsSetNone": {
    en: "No options set — this configuration would run model defaults.",
    fa: "هیچ گزینه‌ای تنظیم نشده — این تنظیم با پیش‌فرض‌های خود مدل اجرا می‌شود.",
  },
  "bench.optionSet": { en: "1 option set", fa: "1 گزینه تنظیم شده" },
  "bench.optionsSet": { en: "{n} options set", fa: "{n} گزینه تنظیم شده" },
  "bench.groupBadge": { en: "{n} set", fa: "{n} تنظیم‌شده" },
  "bench.notSet": { en: "not set", fa: "تنظیم نشده" },
  "bench.nothingToSave": { en: "Nothing to save", fa: "چیزی برای ذخیره نیست" },
  "bench.nothingToSaveBody": {
    en:
      "Set at least one option, otherwise this configuration is identical to " +
      "the model's defaults.",
    fa:
      "دست‌کم یک گزینه را مقدار بدهید، وگرنه این تنظیم با پیش‌فرض‌های خود مدل " +
      "هیچ تفاوتی ندارد.",
  },
  "bench.configAdded": { en: "Configuration added", fa: "تنظیم اضافه شد" },
  "bench.configSaved": { en: "Configuration saved", fa: "تنظیم ذخیره شد" },
  "bench.configDuplicated": { en: "Configuration duplicated", fa: "تنظیم تکثیر شد" },

  "bench.step4": { en: "4 · Run", fa: "4 · اجرا" },
  "bench.keepOutput": { en: "Keep generated text", fa: "نگه‌داشتن متن تولیدشده" },
  "bench.runComparison": { en: "Run benchmark", fa: "اجرای بنچمارک" },
  "bench.nothingToRun": { en: "Nothing to run yet", fa: "هنوز چیزی برای اجرا نیست" },
  "bench.nothingToRunNote": {
    en: "Write at least one prompt and pick at least one model.",
    fa: "دست‌کم یک پرامپت بنویسید و دست‌کم یک مدل انتخاب کنید.",
  },

  // ---------- Benchmark: the plan panel ----------
  // The four kinds a run can be, named from the counts rather than chosen.
  "bench.planNoneLabel": { en: "No test described yet", fa: "هنوز تستی مشخص نشده" },
  "bench.planNoneNote": {
    en: "Pick a model to see what kind of test the inputs describe.",
    fa: "یک مدل انتخاب کنید تا نوع تست مشخص شود.",
  },
  "bench.plan.single": { en: "Model speed test", fa: "سنجش سرعت مدل" },
  "bench.planNote.single": {
    en:
      "One model over {prompts} prompt(s) — {runs} generation(s) in total. Its " +
      "speed, latency and memory as measured on this machine.",
    fa:
      "یک مدل روی {prompts} پرامپت — مجموعاً {runs} تولید. سرعت، تأخیر و " +
      "حافظه‌ی آن، اندازه‌گیری‌شده روی همین سیستم.",
  },
  "bench.plan.configs": { en: "Configuration test", fa: "سنجش تنظیم‌ها" },
  "bench.planNote.configs": {
    en:
      "{configs} configurations on one model — {runs} generation(s) in total. " +
      "Which settings are actually faster for this model.",
    fa:
      "{configs} تنظیم روی یک مدل — مجموعاً {runs} تولید. اینکه کدام تنظیم " +
      "واقعاً برای این مدل سریع‌تر است.",
  },
  "bench.plan.models": { en: "Model comparison", fa: "مقایسه‌ی مدل‌ها" },
  "bench.planNote.models": {
    en:
      "{models} models under the same settings — {runs} generation(s) in " +
      "total, each model measured alone so they never share the GPU.",
    fa:
      "{models} مدل با تنظیم یکسان — مجموعاً {runs} تولید؛ هر مدل جدا " +
      "اندازه‌گیری می‌شود تا GPU را با هم شریک نشوند.",
  },
  "bench.plan.tournament": { en: "Tournament", fa: "مسابقه" },
  "bench.planNote.tournament": {
    en:
      "{models} models, each under the configuration paired with it — {runs} " +
      "generation(s) in total. The full head-to-head.",
    fa:
      "{models} مدل، هر کدام با تنظیمِ خودش — مجموعاً {runs} تولید. " +
      "رقابت کامل رو‌در‌رو.",
  },
  "bench.pairingTitle": { en: "Configuration per model", fa: "تنظیم هر مدل" },
  "bench.pairingNote": {
    en:
      "Several models and several configurations: give each model the one it " +
      "races under.",
    fa:
      "چند مدل و چند تنظیم: به هر مدل تنظیمی بدهید که با آن مسابقه می‌دهد.",
  },
  "bench.defaultConfigName": { en: "defaults", fa: "پیش‌فرض" },
  "bench.factorModel": { en: "1 model", fa: "۱ مدل" },
  "bench.factorModels": { en: "{n} models", fa: "{n} مدل" },
  "bench.factorConfig": { en: "1 config", fa: "۱ تنظیم" },
  "bench.factorConfigs": { en: "{n} configs", fa: "{n} تنظیم" },
  "bench.factorPrompt": { en: "1 prompt", fa: "۱ پرامپت" },
  "bench.factorPrompts": { en: "{n} prompts", fa: "{n} پرامپت" },
  "bench.factorRep": { en: "×{n} reps", fa: "×{n} تکرار" },
  "bench.factorReps": { en: "×{n} reps", fa: "×{n} تکرار" },
  "bench.inProgress": { en: "Comparison in progress", fa: "مقایسه در حال اجراست" },
  "bench.inProgressNote": {
    en: "The setup is locked until this run finishes.",
    fa: "تا پایان این اجرا، تنظیمات قفل است.",
  },
  "bench.notReady": { en: "Not ready to run", fa: "آماده اجرا نیست" },
  "bench.stillMissing": {
    en: "Still missing: {items}.",
    fa: "این موارد مانده: {items}.",
  },
  "bench.missingServer": {
    en: "the Ollama server is not running",
    fa: "سرور Ollama در حال اجرا نیست",
  },
  "bench.missingModel": { en: "no model is selected", fa: "مدلی انتخاب نشده" },
  "bench.missingPrompts": { en: "no prompts were written", fa: "پرامپتی نوشته نشده" },
  "bench.missingConfigs": {
    en: "no configurations were added",
    fa: "تنظیمی اضافه نشده",
  },
  "bench.ready": { en: "Ready to run", fa: "آماده اجراست" },
  "bench.readyNote": {
    en:
      "{n} generation(s). Each one is timed separately, with model load time " +
      "excluded.",
    fa:
      "{n} بار تولید. هر کدام جدا زمان‌سنجی می‌شود و زمان بارگذاری مدل در آن " +
      "حساب نمی‌شود.",
  },
  "bench.listSeparator": { en: ", ", fa: "، " },

  // ---------- Benchmark: cards, progress, results ----------
  "bench.cardModels": { en: "Models", fa: "مدل‌ها" },
  "bench.cardModelsSub": {
    en: "measured one at a time",
    fa: "یکی‌یکی اندازه‌گیری می‌شوند",
  },
  "bench.cardConfigs": { en: "Configurations", fa: "تنظیم‌ها" },
  "bench.cardConfigsSub": {
    en: "none means model defaults",
    fa: "خالی یعنی پیش‌فرض مدل",
  },
  "bench.cardPrompts": { en: "Prompts", fa: "پرامپت‌ها" },
  "bench.cardPromptsSub": {
    en: "answered by every run",
    fa: "در هر اجرا پاسخ داده می‌شوند",
  },
  "bench.cardTotalRuns": { en: "Total runs", fa: "کل اجراها" },
  "bench.cardTotalRunsSub": {
    en: "generations this comparison performs",
    fa: "تعداد تولیدهای این مقایسه",
  },
  "bench.cardServer": { en: "Server", fa: "سرور" },
  "bench.cardServerReady": { en: "ready to benchmark", fa: "آماده بنچمارک" },
  "bench.cardServerNotReady": {
    en: "start Ollama before running",
    fa: "پیش از اجرا، Ollama را روشن کنید",
  },

  "bench.runningSince": { en: "Running since {time}", fa: "در حال اجرا از {time}" },
  "bench.finishedAt": { en: "Finished {time}", fa: "پایان‌یافته در {time}" },
  "bench.failedAt": { en: "Failed at {time}", fa: "ناموفق در {time}" },
  "bench.progressText": {
    en: "Running {runs} generation(s) on {model}.",
    fa: "اجرای {runs} تولید روی {model}.",
  },
  "bench.progressMeta": {
    en: "started {time} · {seconds}s elapsed",
    fa: "شروع {time} · {seconds} ثانیه گذشته",
  },
  "bench.progressStarting": {
    en: "Preparing the run — loading the model and starting the first prompt…",
    fa: "آماده‌سازی اجرا — بارگذاری مدل و شروع اولین پرامپت…",
  },
  "bench.progressStep": {
    en:
      "Configuration {name} ({i} of {n}) · prompt {p} of {pn} · repetition " +
      "{r} of {rn}",
    fa:
      "تنظیم {name} ({i} از {n}) · پرامپت {p} از {pn} · تکرار {r} از {rn}",
  },
  "bench.progressStepModel": {
    en:
      "Model {name} ({i} of {n}) · prompt {p} of {pn} · repetition {r} of {rn}",
    fa: "مدل {name} ({i} از {n}) · پرامپت {p} از {pn} · تکرار {r} از {rn}",
  },
  "bench.runningPlaceholder": {
    en: "The comparison is running…",
    fa: "مقایسه در حال اجراست…",
  },
  "bench.noRunYet": {
    en: "No comparison has been run yet.",
    fa: "هنوز مقایسه‌ای اجرا نشده است.",
  },
  "bench.didNotFinish": {
    en: "The comparison did not finish.",
    fa: "این مقایسه به پایان نرسید.",
  },
  "bench.noResults": {
    en: "The comparison produced no results.",
    fa: "این مقایسه هیچ نتیجه‌ای تولید نکرد.",
  },
  "bench.comparisonFailed": {
    en: "The comparison failed — {error}",
    fa: "مقایسه ناموفق بود — {error}",
  },
  "bench.lostTrack": {
    en: "Lost track of the comparison — {error}",
    fa: "پیگیری وضعیت مقایسه قطع شد — {error}",
  },
  "bench.cannotStart": { en: "Could not start", fa: "شروع نشد" },
  "bench.cannotStartAlert": {
    en: "Could not start the comparison — {error}",
    fa: "مقایسه شروع نشد — {error}",
  },
  "bench.started": { en: "Comparison started", fa: "مقایسه شروع شد" },
  "bench.startedBody": {
    en: "{n} generations queued. This page keeps working while it runs.",
    fa: "{n} تولید در صف قرار گرفت. تا پایان کار می‌توانید همین صفحه را باز نگه دارید.",
  },
  "bench.finished": { en: "Comparison finished", fa: "مقایسه تمام شد" },
  "bench.finishedBody": {
    en: "{n} configurations compared.",
    fa: "{n} تنظیم مقایسه شد.",
  },
  "bench.failed": { en: "Comparison failed", fa: "مقایسه ناموفق بود" },
  "bench.exported": { en: "Setup exported", fa: "فایل تنظیمات ساخته شد" },
  "bench.exportFailed": { en: "Export failed", fa: "ساخت فایل ناموفق بود" },
  "bench.optionsFailed": {
    en: "Could not load the configuration options — {error}",
    fa: "فهرست گزینه‌های تنظیمات بارگذاری نشد — {error}",
  },
  "bench.statusFailed": {
    en: "Could not read the comparison status — {error}",
    fa: "وضعیت مقایسه خوانده نشد — {error}",
  },
  "bench.cannotDiscard": { en: "Could not discard", fa: "حذف نتیجه انجام نشد" },
  "bench.cancelRun": { en: "Cancel run", fa: "لغو اجرا" },
  "bench.cancelled": { en: "Comparison cancelled", fa: "مقایسه لغو شد" },
  "bench.cancelledBody": {
    en: "Results so far were discarded and the model was unloaded.",
    fa: "نتایج تا این لحظه دور انداخته شد و مدل از حافظه خارج شد.",
  },
  "bench.cancelledAt": { en: "Cancelled at {time}", fa: "لغو در {time}" },
  "bench.cannotCancel": { en: "Could not cancel", fa: "لغو انجام نشد" },

  "bench.resultsTitle": { en: "Results", fa: "نتایج" },
  "bench.resultsHead": {
    en: "{model} · {n} configuration(s)",
    fa: "{model} · {n} تنظیم",
  },
  "bench.resultsSub": {
    en:
      "{prompts} prompt(s) each · {reps} repetition(s) · {seconds} s total · " +
      "finished {time}",
    fa:
      "هر کدام {prompts} پرامپت · {reps} تکرار · مجموعاً {seconds} ثانیه · " +
      "پایان در {time}",
  },
  "bench.discardResults": { en: "Discard results", fa: "دور انداختن نتایج" },

  "bench.verdictLabel": { en: "Fastest configuration", fa: "سریع‌ترین تنظیم" },
  "bench.verdictGain": {
    en: "{percent}% faster at generating than the next best configuration.",
    fa: "{percent}٪ سریع‌تر از تنظیم بعدی، در تولید توکن.",
  },
  "bench.verdictTied": {
    en: "Effectively tied with the next best configuration.",
    fa: "عملاً با تنظیم بعدی برابر است.",
  },
  "bench.verdictOnly": {
    en: "It was the only configuration with a measured generation rate.",
    fa: "تنها تنظیمی بود که سرعت تولیدش قابل اندازه‌گیری شد.",
  },
  "bench.noVerdict": { en: "No verdict", fa: "نتیجه‌ای اعلام نمی‌شود" },
  "bench.noVerdictNote": {
    en: "No configuration reported a generation rate. Check the failures below.",
    fa: "هیچ تنظیمی سرعت تولید گزارش نکرد. خطاهای پایین را ببینید.",
  },

  "bench.metricOutput": { en: "Output speed", fa: "سرعت تولید" },
  "bench.metricOutputNote": {
    en: "tokens generated per second · higher is better",
    fa: "توکن تولیدشده در ثانیه · بیشتر بهتر است",
  },
  "bench.metricOutputShort": { en: "output tok/s", fa: "توکن/ثانیه تولید" },
  "bench.metricPrompt": { en: "Prompt speed", fa: "سرعت پردازش پرامپت" },
  "bench.metricPromptNote": {
    en: "prompt tokens processed per second · higher is better",
    fa: "توکن پرامپت پردازش‌شده در ثانیه · بیشتر بهتر است",
  },
  "bench.metricPromptShort": { en: "prompt tok/s", fa: "توکن/ثانیه پرامپت" },
  "bench.metricDuration": { en: "Response time", fa: "زمان پاسخ" },
  "bench.metricDurationNote": {
    en: "seconds per prompt · lower is better",
    fa: "ثانیه برای هر پرامپت · کمتر بهتر است",
  },
  "bench.metricDurationShort": { en: "seconds", fa: "ثانیه" },
  "bench.metricTtft": { en: "First token", fa: "اولین توکن" },
  "bench.metricTtftNote": {
    en:
      "seconds until the first token arrives · lower feels faster · shown " +
      "when timings include it",
    fa:
      "ثانیه تا رسیدن اولین توکن · کمترش سریع‌تر حس می‌شود · در صورت وجود در " +
      "نتایج نمایش داده می‌شود",
  },
  "bench.metricTtftShort": { en: "ttft s", fa: "ثانیه تا اولین توکن" },
  "bench.metricTtftEmpty": {
    en: "no first-token timings in this run",
    fa: "زمان اولین توکن در این اجرا ثبت نشده",
  },

  "bench.colConfiguration": { en: "configuration", fa: "تنظیم" },
  "bench.colOutputTokens": { en: "output tokens", fa: "توکن تولیدشده" },
  "bench.colPrompts": { en: "prompts", fa: "پرامپت‌ها" },
  "bench.allPassed": { en: "all passed", fa: "همه موفق" },
  "bench.nFailed": { en: "{n} failed", fa: "{n} ناموفق" },
  "bench.detailPrompt": { en: "1 prompt", fa: "1 پرامپت" },
  "bench.detailPrompts": { en: "{n} prompts", fa: "{n} پرامپت" },
  "bench.detailFailedSuffix": { en: " · {n} failed", fa: " · {n} ناموفق" },
  "bench.promptFailed": { en: "failed", fa: "ناموفق" },
  "bench.unknownError": { en: "Unknown error", fa: "خطای نامشخص" },
  "bench.emptyResponse": { en: "(empty response)", fa: "(پاسخ خالی)" },
  "bench.statSeconds": { en: "s", fa: "ثانیه" },
  "bench.statOutputRate": { en: "output tok/s", fa: "توکن/ثانیه تولید" },
  "bench.statPromptRate": { en: "prompt tok/s", fa: "توکن/ثانیه پرامپت" },
  "bench.statOutputTokens": { en: "output tokens", fa: "توکن تولیدشده" },
  "bench.statPromptTokens": { en: "prompt tokens", fa: "توکن پرامپت" },
  "bench.statTtft": { en: "ttft s", fa: "ثانیه تا اولین توکن" },
  "bench.statVram": { en: "MB VRAM", fa: "مگابایت VRAM" },
  "bench.statTemperature": { en: "°C GPU", fa: "درجه GPU" },
  "bench.statClock": { en: "MHz clock", fa: "مگاهرتز کلاک" },

  // ---------- Benchmark: repetitions and noise ----------
  "bench.repetitions": { en: "Repetitions", fa: "تکرارها" },
  "bench.repetitionsHint": {
    en:
      "Each prompt runs this many times; results average the runs and report " +
      "how far they spread, so a real difference can be told apart from noise.",
    fa:
      "هر پرامپت این تعداد بار اجرا می‌شود؛ نتیجه میانگین اجراها را می‌دهد و " +
      "میزان پراکندگی‌شان را گزارش می‌کند تا تفاوت واقعی از نویز شناخته شود.",
  },
  "bench.cardTotalRunsRepsSub": {
    en: "{reps} repetition(s) per prompt included",
    fa: "شامل {reps} تکرار برای هر پرامپت",
  },
  "bench.significanceReal": { en: "Real difference", fa: "تفاوت واقعی" },
  "bench.significanceNoise": { en: "Within noise", fa: "در حد نویز" },
  "bench.significanceUnknown": { en: "Unmeasured", fa: "اندازه‌گیری‌نشده" },

  // ---------- Benchmark: history ----------
  "bench.historyTitle": { en: "History", fa: "تاریخچه" },
  "bench.historyRun": { en: "1 saved run", fa: "۱ اجرای ذخیره‌شده" },
  "bench.historyRuns": { en: "{n} saved runs", fa: "{n} اجرای ذخیره‌شده" },
  "bench.historyEmptyShort": { en: "empty", fa: "خالی" },
  "bench.historyEmpty": {
    en: "Finished comparisons are saved here automatically.",
    fa: "مقایسه‌های تمام‌شده به‌صورت خودکار اینجا ذخیره می‌شوند.",
  },
  "bench.historyColSaved": { en: "saved", fa: "زمان ذخیره" },
  "bench.historyColModel": { en: "model(s)", fa: "مدل‌ها" },
  "bench.historyColConfigs": { en: "configs", fa: "تنظیم‌ها" },
  "bench.historyColPrompts": { en: "prompts", fa: "پرامپت‌ها" },
  "bench.historyColWinner": { en: "winner", fa: "برنده" },
  "bench.historyColNoise": { en: "noise verdict", fa: "حکم نویز" },
  "bench.historyDetails": { en: "Details", fa: "جزئیات" },
  "bench.historyNoAverages": { en: "no measured rates", fa: "سرعت قابل‌اندازه‌گیری ثبت نشده" },
  "bench.historyDelete": { en: "Delete", fa: "حذف" },
  "bench.historyDeleteConfirm": {
    en: "Delete this saved comparison from the history? This cannot be undone.",
    fa: "این مقایسه‌ی ذخیره‌شده از تاریخچه حذف شود؟ این کار قابل بازگشت نیست.",
  },
  "bench.historyDeleteDone": { en: "Deleted", fa: "حذف شد" },
  "bench.historyDeleteFailed": { en: "Could not delete", fa: "حذف انجام نشد" },
  "bench.historyLoadFailed": {
    en: "Could not load the history — {error}",
    fa: "بارگذاری تاریخچه ناموفق بود — {error}",
  },
  "bench.savedToHistory": { en: "saved to history", fa: "در تاریخچه ذخیره شد" },

  // ---------- Benchmark: several models in one run ----------
  "bench.resultsHeadModels": {
    en: "{n} model(s) compared",
    fa: "{n} مدل مقایسه شد",
  },
  "bench.modelsNoneInstalled": {
    en: "No installed models found — pull one first.",
    fa: "مدلی یافت نشد — اول یک مدل بگیرید.",
  },
  "bench.verdictWithinNoise": {
    en:
      "The gap to the next configuration is within measurement noise — either " +
      "is fine; pick on other grounds.",
    fa:
      "فاصله با تنظیم بعدی در حد نویز اندازه‌گیری است — هر کدام کافی است؛ " +
      "بر اساس معیارهای دیگر انتخاب کنید.",
  },

  // ---------- Ollama option groups and hints ----------
  // The server publishes the option table (key, type, bounds); only the prose
  // lives here. Option names themselves are Ollama's own identifiers and are
  // never translated — a developer looks them up in Ollama's documentation.
  "optgroup.Sampling": { en: "Sampling", fa: "نمونه‌گیری" },
  "optgroup.Context and output": {
    en: "Context and output",
    fa: "Context و خروجی",
  },
  "optgroup.Repetition": { en: "Repetition", fa: "تکرار" },
  "optgroup.Mirostat": { en: "Mirostat" },
  "optgroup.Runtime": { en: "Runtime", fa: "اجرا" },

  "opt.temperature": {
    en: "Higher values make the output more random.",
    fa: "مقدار بیشتر، خروجی را تصادفی‌تر می‌کند.",
  },
  "opt.top_p": {
    en: "Nucleus sampling cutoff.",
    fa: "آستانه nucleus sampling.",
  },
  "opt.top_k": {
    en: "How many candidate tokens to consider.",
    fa: "چند توکن کاندید در نظر گرفته شود.",
  },
  "opt.min_p": {
    en: "Minimum probability relative to the best token.",
    fa: "کمترین احتمال نسبت به بهترین توکن.",
  },
  "opt.typical_p": {
    en: "Locally typical sampling cutoff.",
    fa: "آستانه locally typical sampling.",
  },
  "opt.seed": {
    en: "Fixing the seed makes a run repeatable.",
    fa: "ثابت کردن seed اجرا را تکرارپذیر می‌کند.",
  },
  "opt.num_ctx": {
    en: "Context window size in tokens.",
    fa: "اندازه پنجره context بر حسب توکن.",
  },
  "opt.num_predict": {
    en: "Maximum tokens to generate. -1 means unlimited.",
    fa: "بیشترین توکن تولیدی. مقدار -1 یعنی بی‌نهایت.",
  },
  "opt.num_keep": {
    en: "Tokens kept from the prompt when the context overflows.",
    fa: "چند توکن از پرامپت وقتی context پر شد نگه داشته شود.",
  },
  "opt.num_batch": {
    en: "Prompt batch size. Affects prompt throughput.",
    fa: "اندازه دسته پردازش پرامپت. روی سرعت پرامپت اثر دارد.",
  },
  "opt.stop": {
    en: "Comma-separated stop sequences.",
    fa: "دنباله‌های توقف، جدا‌شده با کاما.",
  },
  "opt.repeat_penalty": {
    en: "Penalty applied to tokens already seen.",
    fa: "جریمه توکن‌هایی که قبلاً آمده‌اند.",
  },
  "opt.repeat_last_n": {
    en: "How far back the repetition penalty looks.",
    fa: "جریمه تکرار تا چند توکن عقب را می‌بیند.",
  },
  "opt.presence_penalty": {
    en: "Flat penalty for tokens that already appeared.",
    fa: "جریمه ثابت برای توکن‌هایی که یک بار آمده‌اند.",
  },
  "opt.frequency_penalty": {
    en: "Penalty scaled by how often a token appeared.",
    fa: "جریمه‌ای که با تعداد تکرار توکن بزرگ‌تر می‌شود.",
  },
  "opt.penalize_newline": {
    en: "Whether newlines are penalised like other tokens.",
    fa: "آیا خط جدید هم مثل بقیه توکن‌ها جریمه شود.",
  },
  "opt.mirostat": {
    en: "0 disables it, 1 is Mirostat, 2 is Mirostat 2.0.",
    fa: "مقدار 0 خاموش، 1 برای Mirostat و 2 برای Mirostat 2.0.",
  },
  "opt.mirostat_tau": {
    en: "Target entropy. Lower is more focused.",
    fa: "آنتروپی هدف. کمتر یعنی متمرکزتر.",
  },
  "opt.mirostat_eta": {
    en: "How fast Mirostat adapts.",
    fa: "سرعت تطبیق Mirostat.",
  },
  "opt.num_gpu": {
    en: "Layers offloaded to the GPU. 0 forces CPU only.",
    fa: "تعداد لایه‌هایی که به GPU سپرده می‌شود. مقدار 0 یعنی فقط CPU.",
  },
  "opt.num_thread": {
    en: "CPU threads used for generation.",
    fa: "تعداد رشته‌های CPU برای تولید.",
  },
  "opt.use_mmap": {
    en: "Memory-map the weights instead of reading them in.",
    fa: "وزن‌ها با memory-map خوانده شوند، نه کامل در حافظه.",
  },
  "opt.use_mlock": {
    en: "Lock the weights in RAM so they are never swapped out.",
    fa: "وزن‌ها در RAM قفل شوند تا هرگز به swap نروند.",
  },

  // ---------- Console ----------
  "console.done": { en: "done", fa: "انجام شد" },
  "console.failed": { en: "failed", fa: "ناموفق" },
  "console.running": { en: "running", fa: "در حال اجرا" },
  "console.noOutput": { en: "(no output)", fa: "(بدون خروجی)" },

  // ---------- Action toasts ----------
  "action.pending": { en: "{label}…", fa: "{label}…" },
  "action.pendingBody": {
    en: "Working, this can take a moment.",
    fa: "در حال انجام، ممکن است کمی طول بکشد.",
  },
  "action.done": { en: "{label} — done", fa: "{label} — انجام شد" },
  "action.failed": { en: "{label} — failed", fa: "{label} — ناموفق" },
};





