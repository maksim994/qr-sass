type Row = { label: string; value: number | string };

export function ChartDataTable({
  caption,
  labelHeader = "Дата",
  valueHeader = "Значение",
  rows,
}: {
  caption: string;
  labelHeader?: string;
  valueHeader?: string;
  rows: Row[];
}) {
  return (
    <table className="sr-only">
      <caption>{caption}</caption>
      <thead>
        <tr>
          <th scope="col">{labelHeader}</th>
          <th scope="col">{valueHeader}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.label}>
            <th scope="row">{row.label}</th>
            <td>{row.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
