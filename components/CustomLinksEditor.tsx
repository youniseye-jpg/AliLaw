"use client";

export type EditableCustomLink = { name: string; url: string };

export function CustomLinksEditor({ links, onChange }: { links: EditableCustomLink[]; onChange: (links: EditableCustomLink[]) => void }) {
  function update(index: number, patch: Partial<EditableCustomLink>) {
    onChange(links.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  }

  function add() {
    onChange([...links, { name: "", url: "" }]);
  }

  function remove(index: number) {
    onChange(links.filter((_, itemIndex) => itemIndex !== index));
  }

  return <div className="span-2 custom-links-editor">
    <div className="section-toolbar">
      <div>
        <h3>روابط مخصصة</h3>
        <p className="muted">أضف اسم الرابط والرابط نفسه مثل التطبيق.</p>
      </div>
      <button type="button" className="btn small" onClick={add}>+ إضافة رابط</button>
    </div>
    {links.length ? links.map((item, index) => <div className="custom-link-row" key={index}>
      <label>اسم الرابط<input value={item.name} onChange={(e) => update(index, { name: e.target.value })} placeholder="مثال: قناة التليغرام" /></label>
      <label>الرابط<input value={item.url} onChange={(e) => update(index, { url: e.target.value })} placeholder="https://..." /></label>
      <button type="button" className="btn small danger" onClick={() => remove(index)}>حذف</button>
    </div>) : <p className="muted">لا توجد روابط مخصصة بعد.</p>}
  </div>;
}
