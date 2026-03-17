def validate_flowchart(data: dict) -> tuple[bool, str | None]:
    if not isinstance(data, dict):
        return False, "Root must be a JSON object."

    if "nodes" not in data or "edges" not in data:
        return False, "Flowchart must contain 'nodes' and 'edges' arrays."

    if not isinstance(data["nodes"], list) or not isinstance(data["edges"], list):
        return False, "'nodes' and 'edges' must be arrays."

    node_ids = set()
    for i, node in enumerate(data["nodes"]):
        if not isinstance(node, dict):
            return False, f"Node at index {i} is not an object."
        if "id" not in node or "label" not in node:
            return False, f"Node at index {i} missing 'id' or 'label'."
        node_ids.add(node["id"])

    for i, edge in enumerate(data["edges"]):
        if not isinstance(edge, dict):
            return False, f"Edge at index {i} is not an object."
        if "from" not in edge or "to" not in edge:
            return False, f"Edge at index {i} missing 'from' or 'to'."
        if edge["from"] not in node_ids:
            return False, f"Edge at index {i} references unknown source node '{edge['from']}'."
        if edge["to"] not in node_ids:
            return False, f"Edge at index {i} references unknown target node '{edge['to']}'."

    return True, None


def validate_mindmap(data: dict) -> tuple[bool, str | None]:
    if not isinstance(data, dict):
        return False, "Root must be a JSON object."

    if "root" not in data:
        return False, "Mind map must contain a 'root' object."

    def validate_node(node, path="root"):
        if not isinstance(node, dict):
            return False, f"{path} is not an object."
        if "id" not in node or "label" not in node:
            return False, f"{path} missing 'id' or 'label'."
        children = node.get("children", [])
        if not isinstance(children, list):
            return False, f"{path}.children must be an array."
        for i, child in enumerate(children):
            ok, err = validate_node(child, f"{path}.children[{i}]")
            if not ok:
                return False, err
        return True, None

    return validate_node(data["root"])


def validate_diagram_schema(data: dict, diagram_type: str) -> tuple[bool, str | None]:
    if diagram_type == "flowchart":
        return validate_flowchart(data)
    elif diagram_type == "mindmap":
        return validate_mindmap(data)
    return False, f"Unknown diagram type: {diagram_type}"