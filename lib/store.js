/* JSON dosya tabanlı küçük veri deposu.
   Her koleksiyon data/<ad>.json içinde tutulur; yazma işlemi önce geçici
   dosyaya yapılıp sonra yeniden adlandırılır (yarım yazılmış dosya kalmaz). */
"use strict";

const fs = require("fs");
const path = require("path");

class Collection {
  constructor(dir, name, defaults) {
    this.file = path.join(dir, name + ".json");
    this.name = name;
    this.data = defaults;
    this.load();
  }

  load() {
    try {
      const raw = fs.readFileSync(this.file, "utf8");
      this.data = JSON.parse(raw);
    } catch (err) {
      if (err.code !== "ENOENT") {
        // Bozuk dosyayı yedekle, sıfırdan başla — veri kaybı yerine sessizce ezmemek için
        const backup = this.file + ".corrupt-" + Date.now();
        try { fs.copyFileSync(this.file, backup); } catch (_) {}
        console.error("[store] " + this.name + " okunamadı, yedeklendi: " + backup);
      }
      this.save();
    }
  }

  save() {
    const tmp = this.file + ".tmp";
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    fs.writeFileSync(tmp, JSON.stringify(this.data, null, 2), "utf8");
    fs.renameSync(tmp, this.file);
  }
}

function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

module.exports = { Collection, newId };
