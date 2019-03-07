
function record(item, type, records) {
    item.type = type
    records[item.name] = item
    if (Array.isArray(item.children)) {
        item.children.forEach(o => record(o, type, records))
    }
}