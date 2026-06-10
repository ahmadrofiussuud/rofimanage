import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { tasks } = await req.json();

    if (!Array.isArray(tasks) || tasks.length === 0) {
      return NextResponse.json({
        recommendation: "Kamu tidak memiliki tugas aktif saat ini. Silakan tambahkan tugas baru untuk mendapatkan rekomendasi belajar dari AI! ✨",
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    const isKeyPlaceholder = !apiKey || apiKey.includes("your-gemini-key") || apiKey === "";

    // Prompt construction
    const systemInstruction = 
      "You are a study assistant. Given these tasks, recommend which one the student should work on right now. " +
      "Be concise, give 1 main recommendation with 2-3 bullet point reasons, then suggest 1 secondary task. " +
      "Respond in Bahasa Indonesia.";

    const tasksListPrompt = tasks
      .map((t, idx) => `${idx + 1}. Title: "${t.title}", Category: "${t.category || "Uncategorized"}", Deadline: "${t.deadline || "None"}", Priority: "${t.priority}", Progress: ${t.progress}%, Est. Workload: ${t.estimated_hours}h`)
      .join("\n");

    const prompt = `${systemInstruction}\n\nBerikut adalah daftar tugas mahasiswa:\n${tasksListPrompt}\n\nBerikan rekomendasi belajar sekarang.`;

    // Fallback Mock Recommendation if key is unconfigured
    if (isKeyPlaceholder) {
      // Logic-based smart mock helper
      const activeTasks = tasks.filter(t => t.status !== "done");
      const highPriority = activeTasks.filter(t => t.priority === "high");
      const urgentSoon = activeTasks.filter(t => {
        if (!t.deadline) return false;
        const diffDays = Math.ceil((new Date(t.deadline).getTime() - new Date("2026-06-10").getTime()) / (1000 * 60 * 60 * 24));
        return diffDays >= 0 && diffDays <= 2;
      });

      const targetTask = urgentSoon[0] || highPriority[0] || activeTasks[0];
      const secondaryTask = activeTasks.find(t => t.id !== targetTask.id) || null;

      const title = targetTask.title;
      const category = targetTask.category || "Kuliah";
      const deadline = targetTask.deadline ? new Date(targetTask.deadline).toLocaleDateString("id-ID", { day: "numeric", month: "long" }) : "Tidak ada";

      const mockText = `### 🎯 Rekomendasi Utama: **${title}** (${category})

Berdasarkan prioritas akademis dan tenggat waktu kamu, kamu sebaiknya fokus pada tugas ini sekarang karena beberapa alasan:
- **Tenggat Waktu Dekat**: Tugas ini dijadwalkan selesai pada **${deadline}**. Menyelesaikannya sekarang mencegah penumpukan pekerjaan di menit-menit terakhir.
- **Beban Kerja**: Estimasi waktu tugas ini adalah **${targetTask.estimated_hours} jam** dengan progres saat ini masih **${targetTask.progress}%**. Kamu membutuhkan fokus penuh untuk menaikkan progresnya.
- **Prioritas ${targetTask.priority === "high" ? "Tinggi" : "Sedang"}**: Ini adalah tugas krusial yang menunjang performa akademismu di semester ini.

---

### ⏳ Tugas Sekunder:
- **${secondaryTask ? secondaryTask.title : "Lakukan review materi perkuliahan secara umum"}**
  *Kamu bisa beralih ke tugas ini sebagai penyegaran setelah menyelesaikan sesi belajar utama.*`;

      // Simulate network delay for realistic loading states
      await new Promise((resolve) => setTimeout(resolve, 1500));

      return NextResponse.json({ recommendation: mockText });
    }

    // Call real Gemini API
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      let friendlyMessage = "Gagal memproses rekomendasi AI.";
      
      try {
        const errJson = JSON.parse(errText);
        const errMsg = errJson.error?.message || "";
        if (response.status === 429 && (errMsg.includes("prepayment credits") || errMsg.includes("depleted"))) {
          friendlyMessage = "Saldo / kredit API Gemini Anda habis. Silakan isi saldo di Google AI Studio untuk melanjutkan.";
        } else if (response.status === 401 || response.status === 403) {
          friendlyMessage = "API Key Gemini tidak valid atau tidak memiliki izin akses. Silakan cek kembali file .env.local.";
        } else if (errMsg) {
          friendlyMessage = `Gemini API Error: ${errMsg}`;
        }
      } catch {
        if (errText.includes("prepayment credits") || errText.includes("depleted")) {
          friendlyMessage = "Saldo / kredit API Gemini Anda habis. Silakan isi saldo di Google AI Studio untuk melanjutkan.";
        }
      }

      return NextResponse.json(
        { error: friendlyMessage },
        { status: response.status }
      );
    }

    const data = await response.json();
    const recommendationText = data.candidates?.[0]?.content?.parts?.[0]?.text || "Gagal mendapatkan rekomendasi. Silakan coba lagi.";

    return NextResponse.json({ recommendation: recommendationText });
  } catch (error) {
    console.error("Gemini route handler error:", error);
    const errorMessage = error instanceof Error ? error.message : "Gagal memproses rekomendasi AI.";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

