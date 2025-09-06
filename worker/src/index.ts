import type {
  R2Bucket,
  MessageBatch,
  ExecutionContext,
  ExportedHandler,
} from "@cloudflare/workers-types";

export interface Env {
  R2: R2Bucket;
  NEXT_API_BASE: string;
  R2_BUCKET: string;
}

type R2EventBody = {
  bucket: string; // 送信元バケット
  key: string; // 例: uploads/<jobId>/project.zip
  size?: number;
  etag?: string;
};

export default {
  async queue(
    batch: MessageBatch<R2EventBody>,
    env: Env,
    ctx: ExecutionContext
  ) {
    for (const msg of batch.messages) {
      const { key, bucket } = msg.body;

      // 念のためフィルタ
      if (!key?.startsWith("uploads/")) {
        msg.ack();
        continue;
      }

      // jobId を抽出（uploads/<jobId>/...）
      const jobId = key.split("/")[1];
      if (!jobId) {
        console.warn("Cannot parse jobId from key:", key);
        msg.ack();
        continue;
      }

      try {
        // 既存の Next API /api/pack を呼んで変換（R2→取得→dumps生成→results/<jobId>.zip 保存）
        const resp = await fetch(`${env.NEXT_API_BASE}/api/pack`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            objectKey: key,
            originalName: "project.zip",
            jobId, // ← /api/pack 側で results/<jobId>.zip を保存させる
          }),
        });

        if (!resp.ok) {
          const text = await resp.text();
          throw new Error(`pack failed: ${resp.status} ${text}`);
        }

        // 今回は応答ZIPは破棄（/api/pack が R2 保存済みだから）
        // await resp.arrayBuffer();

        msg.ack();
      } catch (err) {
        console.error("Worker job failed:", err);
        // リトライ（Queueの再試行ポリシーに従う）
        msg.retry();
      }

      console.log("QUEUE message:", { key, bucket });
    }
  },
} satisfies ExportedHandler<Env, R2EventBody>;
