import type { VercelRequest, VercelResponse } from "@vercel/node";

function queryValue(prop: string | string[]): string {
    return typeof prop === "string" ? prop : prop[0]!;
}

type SwatchStyle = "square" | "round" | "circle";

function resolveStyle(prop: string, fallback: SwatchStyle): SwatchStyle {
    return prop === "square" || prop === "round" || prop === "circle"
        ? prop
        : fallback;
}

function getFallback(value: string | number): string {
    return typeof value === "number" ? String(value) : value;
}

function parseColor(color: string): string | null {
    if (color.startsWith("oklch")) {
        const { light, chroma, hue, alpha } = color.match(
            /^oklch\((?<light>\d+\.?\d*),(?<chroma>\d+\.?\d*),(?<hue>\d+\.?\d*),(?<alpha>\d+\.?\d*)\)/
        )?.groups || { light: "0", chroma: "0", hue: "0", alpha: "1" };

        return `oklch(${light} ${chroma} ${hue} / ${alpha})`;
    }
    if (/^#?(?:[0-9a-f]{6}|[0-9a-f]{3})$/i.test(color)) {
        let hex = color.replace(/^#?/, "").toUpperCase();
        if (hex.length === 3) hex = [...hex].map((h) => h + h).join("");
        return `#${hex}`;
    }
    return "#000000";
}

const svgAttr =
    "xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'";

export default function endpoint(req: VercelRequest, res: VercelResponse) {
    const color = parseColor(queryValue(req.query["color"]!)),
        style = resolveStyle(
            queryValue(req.query["style"] ?? "square").toLowerCase(),
            "square"
        ),
        size = Number(queryValue(req.query["size"] ?? "20")),
        text = queryValue(req.query["text"] ?? ""),
        textColor = parseColor(
            queryValue(req.query["textColor"] ?? req.query["tc"] ?? "#FFF")
        ),
        top = Number(
            queryValue(req.query["top"] ?? req.query["t"] ?? getFallback("0"))
        ),
        bottom = Number(
            queryValue(
                req.query["bottom"] ?? req.query["b"] ?? getFallback(top)
            )
        ),
        left = Number(
            queryValue(req.query["left"] ?? req.query["l"] ?? getFallback("0"))
        ),
        right = Number(
            queryValue(
                req.query["right"] ?? req.query["r"] ?? getFallback(left)
            )
        ),
        width = left + (text ? text.length * 8 : size) + right,
        height = top + (text ? 15 : size) + bottom;
    // create swatch shape
    let shape: string;

    if (style !== "circle") {
        const radius = style === "round" ? size / 5 : 0;
        if (text) {
            shape = `<rect fill='${color}' x='0' y='0' width='${width}' height='${height}' rx='${radius}'/><text x='${
                width / 2
            }' y='${
                height / 2
            }' fill='${textColor}' font-family='monospace' dominant-baseline='middle' text-anchor='middle'>${text}</text>`;
        } else {
            shape = `<rect fill='${color}' x='${left}' y='${top}' width='${width}' height='${height}' rx='${radius}'/>`;
        }
    } else {
        if (text) {
            shape = `<rect fill='${color}' x=0' y='0' width='${size}' height='${size}' rx='${
                width / 2
            }'/><text x='${left + size / 2}' y='${
                height / 2
            }' fill='${textColor}' font-family='monospace' dominant-baseline='middle' text-anchor='middle'>${text}</text>`;
        } else {
            shape = `<circle fill='${color}' cx='${left + size / 2}' cy='${
                top + size / 2
            }' r='${size / 2}'/>`;
        }
    }
    // set response header
    res.setHeader("Content-Type", "image/svg+xml");
    // send response
    res.send(
        `<svg ${svgAttr} width='${width}' height='${height}' viewBox='0 0 ${width} ${height}'>${shape}</svg>`
    );
}
