---
id: task-5
title: generate step-by-step usage instructions
status: To Do
assignee: []
created_date: "2025-07-14"
labels: []
dependencies: []
---

## Description

When using the apparatus, participants will be required to follow the
"algorithm" to turn the input values into the output values.

1. for each slider in ring A (input ring), set the value based on the colour
   (white = 0, black = 1) of the corresponding pixel in the input image grid

2. for each slider in ring A:

   - read slider value
   - read value of same-numbered slider in ring **B0**
   - multiply the two values (using slide rule ring) and _adjust_ the value of
     slider **C0** by the result

3. repeat step 2 for each bank of sliders in ring B (**B1**, **B2**, etc.) until
   all of the sliders in ring C have been fully adjusted

   - once that's done, if any slider in ring C has a negative value, set it to 0

4. repeat the process of steps 2 and 3, but starting with ring C (instead of
   ring A)

5. once all the sliders in ring E have been fully adjusted, the slider in ring E
   with the highest value is the output value

### Notes

This procedure assumes that the weights (rings B and D) are pre-populated with
the correct values.

To _adjust_ by a value means to add or subtract the value from the current value
of the slider. To _set_ the value means the slider should show that value
(regardless of the previous value).
