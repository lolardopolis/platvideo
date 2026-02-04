import re

file_path = 'src/pages/VideoPlayerPage.tsx'

with open(file_path, 'r') as f:
    content = f.read()

# Remove the bad drop-shadow classes
content = content.replace(' drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]', '')
content = content.replace('drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]', '')

# Improve gradient and container style
# Locate the specific div for controls overlay
# We look for the div that has the gradient
gradient_pattern = r'(className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 via-black/60 to-transparent flex flex-col justify-end min-h-\[100px\] opacity-0 group-hover:opacity-100 transition-opacity")'
replacement_gradient = 'className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-black/80 to-transparent flex flex-col justify-end min-h-[120px] opacity-0 group-hover:opacity-100 transition-opacity"'

content = re.sub(gradient_pattern, replacement_gradient, content)

# Add text shadow to the inner flex container
# Find <div className="flex items-center gap-4">
# Replace with <div className="flex items-center gap-4 text-white" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
# Note: I'll target the one inside the controls overlay
content = content.replace('<div className="flex items-center gap-4">', '<div className="flex items-center gap-4 text-white" style={{ textShadow: "0 2px 4px rgba(0,0,0,0.8)" }}>')

with open(file_path, 'w') as f:
    f.write(content)

print("Successfully updated VideoPlayerPage.tsx")
