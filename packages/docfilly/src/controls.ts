import type { DocfillyVariable } from "./types";

let controlId = 0;

function nextControlId(): string {
  controlId += 1;
  return `docfilly-control-${controlId}`;
}

export function createControl(variable: DocfillyVariable): HTMLDivElement {
  const group = document.createElement("div");
  group.className = `docfilly__field docfilly__field--${variable.type}`;

  const id = nextControlId();
  const label = document.createElement("label");
  label.htmlFor = id;
  label.textContent = variable.label;

  if (variable.type === "checkbox") {
    const input = document.createElement("input");
    input.type = "checkbox";
    input.id = id;
    input.name = variable.name;
    input.checked = variable.initialValue;
    group.append(input, label);
    return group;
  }

  if (variable.type === "select") {
    const select = document.createElement("select");
    select.id = id;
    select.name = variable.name;
    for (const option of variable.options) {
      const optionElement = document.createElement("option");
      optionElement.value = option;
      optionElement.textContent = option;
      optionElement.selected = option === variable.initialValue;
      select.append(optionElement);
    }
    group.append(label, select);
    return group;
  }

  const input = document.createElement("input");
  input.type = "text";
  input.id = id;
  input.name = variable.name;
  input.value = variable.initialValue;
  group.append(label, input);
  return group;
}
