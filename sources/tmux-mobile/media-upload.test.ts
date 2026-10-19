import { beforeEach, describe, expect, it, vi } from "vitest";
import { MAX_UPLOAD_BYTES, MEDIA_LIBRARY_OPTIONS, mediaUploadAsset } from "./media-upload";
import { getInfoAsync, readAsStringAsync } from "expo-file-system/legacy";
import { TmuxMobileApi } from "./api";

vi.mock("expo-constants", () => ({ default: { expoConfig: {} } }));
vi.mock("expo-file-system/legacy", () => ({
  EncodingType: { Base64: "base64" },
  getInfoAsync: vi.fn(),
  readAsStringAsync: vi.fn(),
}));

describe("photo and video uploads", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lets both upload entry points select mixed photos and videos", () => {
    expect(MEDIA_LIBRARY_OPTIONS.mediaTypes).toEqual(["images", "videos"]);
    expect(MEDIA_LIBRARY_OPTIONS.allowsMultipleSelection).toBe(true);
  });

  it.each([
    ["clip.MOV", "video/quicktime"], ["clip.mp4", "video/mp4"],
    ["clip.webm", "video/webm"], ["photo.HEIC", "image/heic"],
    ["photo.jpg", "image/jpeg"], ["photo.png", "image/png"],
  ])("infers %s without mislabelling videos as JPEG", (name, mimeType) => {
    expect(mediaUploadAsset({ uri: `file:///cache/${name}`, fileName: null }).mimeType).toBe(mimeType);
  });

  it("retains native metadata and keeps unknown videos generic", () => {
    expect(mediaUploadAsset({ uri: "file:///cache/export.mov", fileName: "recording.mov", mimeType: "video/quicktime", type: "video" }))
      .toEqual({ uri: "file:///cache/export.mov", name: "recording.mov", mimeType: "video/quicktime" });
    expect(mediaUploadAsset({ uri: "content://library/42", type: "video" }))
      .toEqual({ uri: "content://library/42", name: "42", mimeType: "application/octet-stream" });
  });

  it("rejects oversized videos before reading their bytes or making a request", async () => {
    vi.mocked(getInfoAsync).mockResolvedValue({ exists: true, uri: "file:///clip.mov", isDirectory: false, modificationTime: 0, size: MAX_UPLOAD_BYTES + 1 });
    const api = new TmuxMobileApi("https://eng.xyznot.com");
    const request = vi.spyOn(api, "request");
    await expect(api.uploadFile("machine", "%3", { uri: "file:///clip.mov", name: "clip.mov", type: "video/quicktime" }))
      .rejects.toThrow("25 MB upload limit");
    expect(readAsStringAsync).not.toHaveBeenCalled();
    expect(request).not.toHaveBeenCalled();
  });

  it("sends video bytes, name and MIME type to the original target", async () => {
    vi.mocked(getInfoAsync).mockResolvedValue({ exists: true, uri: "file:///clip.mov", isDirectory: false, modificationTime: 0, size: MAX_UPLOAD_BYTES });
    vi.mocked(readAsStringAsync).mockResolvedValue("AAECAw==");
    const api = new TmuxMobileApi("https://eng.xyznot.com");
    const request = vi.spyOn(api, "request").mockResolvedValue({ path: "/tmp/clip.mov" });
    const result = await api.uploadFile("machine", "%3", { uri: "file:///clip.mov", name: "clip.mov", type: "video/quicktime" });
    expect(result).toEqual({ path: "/tmp/clip.mov" });
    expect(request).toHaveBeenCalledWith("/api/upload?paneId=%253&name=clip.mov", expect.objectContaining({
      machineId: "machine", headers: { "content-type": "video/quicktime" },
    }));
    expect(new Uint8Array(request.mock.calls[0][1]!.body as ArrayBuffer)).toEqual(new Uint8Array([0, 1, 2, 3]));
  });

  it("asks for a new selection when the cached file disappeared", async () => {
    vi.mocked(getInfoAsync).mockResolvedValue({ exists: false, uri: "file:///gone.mov", isDirectory: false });
    await expect(new TmuxMobileApi().uploadFile("machine", "%3", { uri: "file:///gone.mov", name: "gone.mov" }))
      .rejects.toThrow("select it again");
    expect(readAsStringAsync).not.toHaveBeenCalled();
  });
});
