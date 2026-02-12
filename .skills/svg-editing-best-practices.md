# SVG 编辑最佳实践

## 常见陷阱：重复关闭标签

编辑 SVG 文件时，确保：
1. 结尾只有 **一个** `</svg>` 标签
2. 所有元素（包括注释）必须在根 `<svg>` 元素内
3. 提交前使用 XML 验证器检查

## 验证清单

提交 SVG 更改前：
- [ ] 文件只有一个 `</svg>` 标签
- [ ] `</svg>` 后没有内容
- [ ] xmllint 验证通过
- [ ] 浏览器预览正常渲染

## 快速检查命令

```bash
# 检查重复关闭标签
cd home/public/images/blog-covers
for file in *.svg; do
  count=$(grep -c "</svg>" "$file")
  if [ "$count" -ne 1 ]; then
    echo "⚠️  $file: $count 个关闭标签"
  fi
done

# 检查水印
for file in *.svg; do
  if grep -q "Jerret's Blog" "$file"; then
    echo "✅ $file: 水印正常"
  else
    echo "⚠️  $file: 无水印"
  fi
done
```

## 历史问题记录

- **2025-02-12**: version-lock-cover.svg 出现重复 `</svg>` 标签（第二次发生）
- **影响**: Astro SVG 解析失败，显示 "Extra content at the end of the document"
- **修复**: 移除重复标签，将日期元素移到 `</svg>` 之前

## 预防措施

建议在 CI/CD 中添加：
```bash
# 预提交钩子示例
xmllint --noout *.svg || exit 1
```
