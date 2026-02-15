with open('App.js', 'r') as f:
    lines = f.readlines()

# Line numbers are 1-indexed, but Python lists are 0-indexed
# We need to delete:
# Lines 7330, 7331, 7347, 7348-7356, 7357 from the original
# Then move 7348-7356 content to after line 7394 (Date field)

# But indices change as we delete, so let's be careful
# Read the unmodified content in the problematic range first

# Let me just rewrite the file more carefully
result = []
i = 0
while i < len(lines):
    # Skip the flexDirection row if we're at line 7330 (0-indexed: 7329)
    if i == 7329:  # "                    <View style={{ flexDirection: 'row',"
        # Skip this line and the next (inner flex wrapper)
        i += 1  # Skip line 7330
        i += 1  # Skip line 7331 (inner flex: 1 wrapper)
        
        # Now add the lines from 7332 to 7346 (without the flex wrapper)
        while i < len(lines) and i < 7347:  # Up to but not including line 7347 (0-indexed: 7346)
            result.append(lines[i])
            i += 1
        
        # Skip the closing of the flex wrapper (line 7347, 0-indexed: 7346)
        # This is already handled by our while loop condition
        if i == 7346:  # This would be line 7347, which closes the flex: 1 wrapper
            i += 1  # Skip it
        
        # Now skip the flexDirection Row's closing </View> (line 7357, 0-indexed: 7356)
        # But we need to include everything in between
        # Actually this is complicated... let me re-think...
        
        # The structure is:
        # 7330: <View style={{ flexDirection: 'row'
        # 7331:   <View style={{ flex: 1 }}>
        # 7332-7346: Content
        # 7347:   </View> (closes flex: 1)
        # 7348-7356: TouchableOpacity (Remove button)
        # 7357: </View> (closes flexDirection row)
        # 7358: Empty
        # 7359: {/* Show linked items... */}
        # etc.
        
        # So when we're at 7330, we need to:
        # 1. Skip 7330-7331 (row and flex wrapper open)
        # 2. Add 7332-7346 (content without indenting change)
        # 3. Skip 7347 (flex wrapper close)
        # 4. Add 7348-7356 (TouchableOpacity) with less indentation
        # 5. Skip 7357 (row close)
        # 6. Continue with 7358+
        
        # But 7335 is "i += 1" at the end of the first while, so we're now at line 7347
        # Actually, let me restart this more carefully
        continue
    
    result.append(lines[i])
    i += 1

print(f"Processed {len(result)} lines")
print(f"Original had {len(lines)} lines")
