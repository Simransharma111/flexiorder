import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Share } from "@capacitor/share";
import { FiChevronLeft, FiChevronRight, FiDownload, FiRefreshCw, FiShare2, FiX } from "react-icons/fi";
import useDialogFocus from "../../hooks/useDialogFocus";
import { downloadFile, isNativeApp, writeTempShareFile } from "../../utils/fileDownload";
import { buildCategoryList, categoryKey, dishCategoryName } from "../../utils/menuCategories";
import { buildMenuPrintModel, defaultMenuPrintSelection, menuPrintDishId } from "../../utils/menuPrintModel";
import { createMenuPrintPdf, menuPrintFilename } from "../../utils/menuPrintPdf";
import { isSimpleMenu } from "../../utils/menuPresentation";
import "./MenuPdfDialog.css";

const INITIAL_SETTINGS = {
  format: "A4", layout: "poster", includeCover: false, includeLogo: true,
  includePhotos: undefined, includeDescriptions: true, includeDietary: true,
  includeContact: true, notes: "", textStyle: "modern", textSize: "standard",
};

export default function MenuPdfDialog({ open, onClose, restaurant, dishes, categories, isOnline, pendingCount = 0 }) {
  const dialogRef = useRef(null);
  const cancelRef = useRef(null);
  const wasOpenRef = useRef(false);
  const defaultSettings = useCallback(() => ({
    ...INITIAL_SETTINGS,
    includePhotos: !isSimpleMenu(restaurant),
  }), [restaurant]);
  const [selected, setSelected] = useState(() => defaultMenuPrintSelection(dishes));
  const [settings, setSettings] = useState(defaultSettings);
  const [result, setResult] = useState(null);
  const [working, setWorking] = useState(false);
  const [progress, setProgress] = useState("");
  const [message, setMessage] = useState("");
  const [page, setPage] = useState(0);
  const orderedCategoryKeys = useMemo(() => buildCategoryList(dishes, categories)
    .filter((category) => categoryKey(category) !== "all")
    .map(categoryKey), [categories, dishes]);

  const close = useCallback(() => {
    cancelRef.current?.abort();
    onClose();
  }, [onClose]);
  useDialogFocus(open, dialogRef, close);

  useEffect(() => {
    if (!open) {
      wasOpenRef.current = false;
      return;
    }
    // A refreshed live menu must not replace a preview's captured snapshot.
    if (wasOpenRef.current) return;
    wasOpenRef.current = true;
    setSelected(defaultMenuPrintSelection(dishes));
    setSettings(defaultSettings());
    setResult(null); setMessage(""); setPage(0);
  }, [defaultSettings, dishes, open]);

  useEffect(() => {
    if (!open) return undefined;
    const handleOwnerBack = (event) => {
      event.preventDefault();
      close();
    };
    window.addEventListener("flexiorder:owner-menu-back", handleOwnerBack);
    return () => window.removeEventListener("flexiorder:owner-menu-back", handleOwnerBack);
  }, [close, open]);

  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [open]);

  const selectedCount = selected.size;
  const updateSetting = (key, value) => {
    setSettings((current) => {
      if (key !== "layout") return { ...current, [key]: value };
      const format = value === "booklet"
        ? (current.format === "A5" ? "A5" : "A4")
        : (current.format === "A3" ? "A3" : "A4");
      return { ...current, layout: value, format, includeCover: current.includeCover };
    });
    setResult(null); setPage(0);
  };
  const toggleDish = (id) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
    setResult(null); setPage(0);
  };
  const toggleCategory = (category) => {
    const ids = dishes
      .filter((dish) => dish.isAvailable !== false && menuPrintDishId(dish) && categoryKey(dishCategoryName(dish) || "Uncategorized") === category)
      .map(menuPrintDishId);
    const allSelected = ids.every((id) => selected.has(id));
    setSelected((current) => {
      const next = new Set(current);
      ids.forEach((id) => allSelected ? next.delete(id) : next.add(id));
      return next;
    });
    setResult(null); setPage(0);
  };

  const generate = async () => {
    if (!selectedCount || working) return;
    const controller = new AbortController();
    cancelRef.current = controller;
    setWorking(true); setMessage(""); setProgress("Preparing your menu snapshot…");
    try {
      const snapshot = buildMenuPrintModel({
        restaurant,
        dishes,
        categories,
        selectedDishIds: new Set(selected),
        settings: { ...settings, allowRemoteImages: isOnline },
      });
      const generated = await createMenuPrintPdf(snapshot, {
        signal: controller.signal,
        onProgress: ({ stage, completed, total, failed }) => {
          setProgress(stage === "images" ? `Loading local photos (${completed}/${total})…` : `Rendering page ${completed}/${total}…`);
          if (failed?.length) setMessage(`${failed.length} photo${failed.length === 1 ? "" : "s"} could not be used; the PDF keeps its text layout.`);
        },
      });
      setResult({ ...generated, snapshot }); setPage(0);
      const count = generated.imageFailures.length;
      const notices = [
        count ? `${count} photo${count === 1 ? "" : "s"} unavailable; preview uses text-only entries for them.` : "Preview ready. Download and share use these exact pages.",
        ...snapshot.warnings,
      ];
      setMessage(notices.join(" "));
    } catch (error) {
      if (error?.name !== "AbortError") setMessage(error?.message || "Could not create the PDF. Try again.");
    } finally {
      if (cancelRef.current === controller) cancelRef.current = null;
      setWorking(false); setProgress("");
    }
  };
  const cancel = () => cancelRef.current?.abort();
  const download = async () => {
    if (!result) return;
    try {
      const saved = await downloadFile(result.blob, menuPrintFilename(result.snapshot));
      setMessage(saved.native ? `Saved to ${saved.label}.` : "PDF downloaded.");
    } catch { setMessage("Could not save the PDF. The preview is still available; try again."); }
  };
  const share = async () => {
    if (!result) return;
    try {
      const filename = menuPrintFilename(result.snapshot);
      if (isNativeApp()) {
        const uri = await writeTempShareFile(result.blob, filename);
        await Share.share({ title: `${result.snapshot.restaurant.name} menu`, text: "Menu PDF", url: uri, dialogTitle: "Save or share menu PDF" });
      } else {
        const file = new File([result.blob], filename, { type: "application/pdf" });
        if (!navigator.share || (navigator.canShare && !navigator.canShare({ files: [file] }))) throw new Error("Sharing is unavailable in this browser. Use Download PDF.");
        await navigator.share({ title: `${result.snapshot.restaurant.name} menu`, files: [file] });
      }
      setMessage("Share sheet opened. Confirm the destination in the app you choose.");
    } catch (error) {
      setMessage(error?.name === "AbortError" ? "Sharing was cancelled. The preview remains ready." : error?.message || "Could not open sharing. Use Download PDF instead.");
    }
  };

  if (!open) return null;
  return <div className="menu-pdf-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
    <section ref={dialogRef} className="menu-pdf-dialog" role="dialog" aria-modal="true" aria-labelledby="menu-pdf-title" tabIndex="-1">
      <header className="menu-pdf-dialog__header"><div><h2 id="menu-pdf-title">Create menu PDF</h2><p>Print-only snapshot — your live menu is never changed.</p></div><button type="button" aria-label="Close menu PDF creator" onClick={close}><FiX /></button></header>
      <div className="menu-pdf-dialog__body">
        <aside className="menu-pdf-dialog__controls">
          <p className="menu-pdf-dialog__notice">{isOnline ? "Uses this device’s current menu snapshot." : "Offline: cached dishes can still be printed; remote photos may be unavailable."}</p>
          {(pendingCount > 0) && <p className="menu-pdf-dialog__warning">{pendingCount} pending menu change{pendingCount === 1 ? "" : "s"} is included as currently saved on this device.</p>}
          <fieldset><legend>Print layout</legend><label><input type="radio" checked={settings.layout === "poster"} onChange={() => updateSetting("layout", "poster")} /> Poster</label><label><input type="radio" checked={settings.layout === "booklet"} onChange={() => updateSetting("layout", "booklet")} /> Multipage booklet</label>
            <select aria-label="Paper size" value={settings.format} onChange={(event) => updateSetting("format", event.target.value)}>{settings.layout === "poster" ? <><option>A4</option><option>A3</option></> : <><option>A4</option><option>A5</option></>}</select>
          </fieldset>
          <fieldset className="menu-pdf-dialog__type"><legend>Text appearance</legend>
            <label>Text style<select aria-label="Text style" value={settings.textStyle} onChange={(event) => updateSetting("textStyle", event.target.value)}><option value="modern">Modern · clean sans serif</option><option value="classic">Classic · elegant serif</option><option value="bold">Bold · strong contrast</option></select></label>
            <label>Text size<select aria-label="Text size" value={settings.textSize} onChange={(event) => updateSetting("textSize", event.target.value)}><option value="standard">Standard</option><option value="large">Large · easier to read</option></select></label>
          </fieldset>
          <fieldset><legend>Include</legend>{[["includeCover", "Full-image cover page"], ["includeLogo", "Restaurant logo"], ["includePhotos", "Dish photos"], ["includeDescriptions", "Descriptions"], ["includeDietary", "Non-veg and egg labels"], ["includeContact", "Contact details"]].map(([key, label]) => <label key={key}><input type="checkbox" checked={Boolean(settings[key])} onChange={(event) => updateSetting(key, event.target.checked)} /> {label}</label>)}</fieldset>
          <label className="menu-pdf-dialog__notes">Print-only note<textarea value={settings.notes} onChange={(event) => updateSetting("notes", event.target.value)} placeholder="e.g. Prices subject to change" maxLength="280" /></label>
          <details><summary>Select dishes ({selectedCount})</summary>{orderedCategoryKeys.map((category) => { const categoryDishes = dishes.filter((dish) => categoryKey(dishCategoryName(dish) || "Uncategorized") === category); const availableIds = categoryDishes.filter((dish) => dish.isAvailable !== false).map(menuPrintDishId).filter(Boolean); return <div className="menu-pdf-dialog__category" key={category}><label><input type="checkbox" checked={availableIds.length > 0 && availableIds.every((id) => selected.has(id))} onChange={() => toggleCategory(category)} disabled={!availableIds.length} /> {categoryDishes[0] ? dishCategoryName(categoryDishes[0]) || "Uncategorized" : "Uncategorized"}</label>{categoryDishes.map((dish) => <label className="menu-pdf-dialog__dish" key={menuPrintDishId(dish)}><input type="checkbox" checked={selected.has(menuPrintDishId(dish))} onChange={() => toggleDish(menuPrintDishId(dish))} disabled={dish.isAvailable === false} /> {dish.name || "Unnamed dish"}{dish.isAvailable === false ? " (hidden)" : ""}</label>)}</div>; })}</details>
          <p className="menu-pdf-dialog__hint">Category order follows the current menu. Poster pages continue rather than shrinking text. Large text may add pages. Enable a full-image cover for an image-led first page.</p>
          <button type="button" className="menu-pdf-dialog__generate" onClick={generate} disabled={!selectedCount || working}>{working ? progress || "Creating…" : result ? <><FiRefreshCw /> Regenerate preview</> : "Generate preview"}</button>{working && <button type="button" className="menu-pdf-dialog__cancel" onClick={cancel}>Cancel generation</button>}
        </aside>
        <main className="menu-pdf-dialog__preview" aria-live="polite"><h3>Preview</h3>{result ? <><img src={result.pages[page]} alt={`Printable menu page ${page + 1} of ${result.pages.length}`} /><div className="menu-pdf-dialog__pages"><button type="button" onClick={() => setPage((value) => Math.max(0, value - 1))} disabled={!page} aria-label="Previous PDF page"><FiChevronLeft /></button><span>Page {page + 1} of {result.pages.length}</span><button type="button" onClick={() => setPage((value) => Math.min(result.pages.length - 1, value + 1))} disabled={page === result.pages.length - 1} aria-label="Next PDF page"><FiChevronRight /></button></div><div className="menu-pdf-dialog__actions"><button type="button" onClick={download}><FiDownload /> Download PDF</button><button type="button" onClick={share}><FiShare2 /> Save / share</button></div><p className="menu-pdf-dialog__accessibility">Accessible summary: {result.snapshot.sections.map((section) => `${section.name}: ${section.dishes.map((dish) => `${dish.name}, ${dish.priceLabel}`).join("; ")}`).join(". ")}</p></> : <p className="menu-pdf-dialog__empty">Configure the print copy and generate a preview. PDF text is rasterized for print-focused multilingual pages and is not selectable.</p>}{message && <p className="menu-pdf-dialog__status" role="status">{message}</p>}</main>
      </div>
    </section>
  </div>;
}
