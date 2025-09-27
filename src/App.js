import React, { useEffect, useState, useMemo } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import "./App.css";
import bgImage from './images/ib.jpg';

export default function App() {
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortField, setSortField] = useState(null);
  const [sortDir, setSortDir] = useState("asc");
  const [selected, setSelected] = useState(new Set());
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(5);

  // Fetch mock users
  useEffect(() => {
    fetch("https://jsonplaceholder.typicode.com/users")
      .then(res => res.json())
      .then(data =>
        setRows(
          data.map(u => ({
            id: u.id,
            name: u.name,
            email: u.email,
            status: Math.random() > 0.5 ? "Active" : "Inactive"
          }))
        )
      );
  }, []);

  // Filter + search + sort
  const processed = useMemo(() => {
    let data = [...rows];
    if (statusFilter !== "All") data = data.filter(r => r.status === statusFilter);
    if (search.trim() !== "") {
      const q = search.toLowerCase();
      data = data.filter(r => r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q));
    }
    if (sortField) {
      data.sort((a, b) => {
        const A = a[sortField].toLowerCase();
        const B = b[sortField].toLowerCase();
        if (A < B) return sortDir === "asc" ? -1 : 1;
        if (A > B) return sortDir === "asc" ? 1 : -1;
        return 0;
      });
    }
    return data;
  }, [rows, search, statusFilter, sortField, sortDir]);

  // Pagination
  const totalPages = Math.ceil(processed.length / perPage) || 1;
  const pageData = processed.slice((page - 1) * perPage, page * perPage);

  // Handlers
  const toggleSelect = id => {
    setSelected(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };

  const selectAllPage = checked => {
    setSelected(prev => {
      const s = new Set(prev);
      pageData.forEach(r => (checked ? s.add(r.id) : s.delete(r.id)));
      return s;
    });
  };

  const handleDelete = id => setRows(prev => prev.filter(r => r.id !== id));
  const handleToggle = id =>
    setRows(prev => prev.map(r => (r.id === id ? { ...r, status: r.status === "Active" ? "Inactive" : "Active" } : r)));
  const handleEdit = row => console.log("Edit row:", row);

  // Exports
  const toExport = onlySelected =>
    (onlySelected ? processed.filter(r => selected.has(r.id)) : processed).map(r => ({
      ID: r.id,
      Name: r.name,
      Email: r.email,
      Status: r.status
    }));

  const exportCSV = data => {
    const header = Object.keys(data[0]).join(",");
    const csv = [header, ...data.map(r => Object.values(r).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "export.csv";
    link.click();
  };

  const exportExcel = data => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    XLSX.writeFile(wb, "export.xlsx");
  };

  const exportPDF = (data) => {
  if (!data || data.length === 0) {
    alert("No rows to export");
    return;
  }

  const doc = new jsPDF();

  // Optional title
  doc.setFontSize(14);
  doc.text("User Data Export", 14, 15);

  // Prepare headers + body
  const headers = [Object.keys(data[0])];
  const body = data.map(row => Object.values(row));

  // Call the plugin correctly
  autoTable(doc, {
    startY: 25,
    head: headers,
    body: body
  });

  doc.save("export.pdf");
};

  return (
    <div className="app" style={{
        background: `url(${bgImage}) no-repeat center center fixed`,
        backgroundSize: 'cover'
      }}
    >
      {/* rest of your app */}
      <h2>Dynamic Data Table</h2>
      <div className="controls">
        <input placeholder="Search name/email" value={search} onChange={e => setSearch(e.target.value)} />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="All">All</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>
        <select value={perPage} onChange={e => setPerPage(Number(e.target.value))}>
          <option value={5}>5</option>
          <option value={7}>7</option>
          <option value={10}>10</option>
        </select>
        <button onClick={() => exportCSV(toExport(false))}>CSV</button>
        <button onClick={() => exportExcel(toExport(false))}>Excel</button>
        <button onClick={() => exportPDF(toExport(false))}>PDF</button>
        <button onClick={() => exportCSV(toExport(true))} disabled={!selected.size}>CSV (Selected)</button>
        {/* <button onClick={() => exportExcel(toExport(true))} disabled={!selected.size}>Excel (Selected)</button> */}
        <button onClick={() => exportPDF(toExport(true))} disabled={!selected.size}>PDF (Selected)</button>
      </div>

      <table>
        <thead>
          <tr>
            <th><input type="checkbox" checked={pageData.every(r => selected.has(r.id))} onChange={e => selectAllPage(e.target.checked)} /></th>
            <th>ID</th>
            <th onClick={() => setSortField("name")}>Name {sortField === "name" && (sortDir === "asc" ? "▲" : "▼")}</th>
            <th onClick={() => setSortField("email")}>Email {sortField === "email" && (sortDir === "asc" ? "▲" : "▼")}</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {pageData.length === 0 ? (
            <tr><td colSpan="6">No data</td></tr>
          ) : pageData.map(r => (
            <tr key={r.id}>
              <td><input type="checkbox" checked={selected.has(r.id)} onChange={() => toggleSelect(r.id)} /></td>
              <td>{r.id}</td>
              <td>{r.name}</td>
              <td>{r.email}</td>
              <td><button onClick={() => handleToggle(r.id)}>{r.status}</button></td>
              <td>
                <button onClick={() => handleEdit(r)}>Edit</button>
                <button onClick={() => handleDelete(r.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="pagination">
        <button onClick={() => setPage(p => Math.max(1, p - 1))}>Prev</button>
        <span>{page}/{totalPages}</span>
        <button onClick={() => setPage(p => Math.min(totalPages, p + 1))}>Next</button>
      </div>
    </div>
  );
}
