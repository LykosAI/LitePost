import { TestScript, TestAssertion, TestResult, Response } from "@/types"

interface TestContext {
  response: Response
  test: (name: string, fn: () => void) => void
  expect: (value: any) => {
    to: {
      equal: (expected: any) => void
      contain: (expected: any) => void
      exist: () => void
      be: {
        greaterThan: (expected: number) => void
        lessThan: (expected: number) => void
      }
    }
  }
}

function createTestContext(response: Response): [TestContext, () => { name: string; success: boolean; message?: string }[]] {
  const testResults: { name: string; success: boolean; message?: string }[] = []

  const context: TestContext = {
    response,
    test: (name: string, fn: () => void) => {
      try {
        fn()
        testResults.push({ name, success: true })
      } catch (error) {
        testResults.push({ 
          name, 
          success: false, 
          message: error instanceof Error ? error.message : 'Test failed'
        })
      }
    },
    expect: (value: any) => ({
      to: {
        equal: (expected: any) => {
          if (value !== expected) {
            throw new Error(`Expected ${value} to equal ${expected}`)
          }
        },
        contain: (expected: any) => {
          if (!value?.includes?.(expected)) {
            throw new Error(`Expected ${value} to contain ${expected}`)
          }
        },
        exist: () => {
          if (value === undefined || value === null) {
            throw new Error('Expected value to exist')
          }
        },
        be: {
          greaterThan: (expected: number) => {
            if (typeof value !== 'number' || value <= expected) {
              throw new Error(`Expected ${value} to be greater than ${expected}`)
            }
          },
          lessThan: (expected: number) => {
            if (typeof value !== 'number' || value >= expected) {
              throw new Error(`Expected ${value} to be less than ${expected}`)
            }
          },
        },
      },
    }),
  }

  return [context, () => testResults]
}

function getValueFromPath(obj: any, path: string): any {
  // Handle array indices in path (e.g. "items[0].id")
  const parts = path.split('.')
  return parts.reduce((acc, part) => {
    // Check if part contains array index
    const match = part.match(/^(\w+)\[(\d+)\]$/)
    if (match) {
      const [_, arrayName, index] = match
      return acc?.[arrayName]?.[parseInt(index)]
    }
    return acc?.[part]
  }, obj)
}

function evaluateAssertion(
  assertion: TestAssertion,
  response: Response
): { success: boolean; message: string } {
  try {
    let actualValue: any
    
    switch (assertion.type) {
      case 'status':
        actualValue = response.status
        break
      case 'json':
        try {
          const jsonBody = JSON.parse(response.body)
          actualValue = assertion.property
            ? getValueFromPath(jsonBody, assertion.property)
            : jsonBody
        } catch {
          return {
            success: false,
            message: 'Response body is not valid JSON',
          }
        }
        break
      case 'header':
        actualValue = assertion.property
          ? response.headers[assertion.property.toLowerCase()]
          : null
        break
      case 'responseTime':
        actualValue = response.timing?.duration || 0
        break
    }

    switch (assertion.operator) {
      case 'equals':
        if (actualValue != assertion.expected) {
          return {
            success: false,
            message: `Expected ${assertion.type} to equal ${assertion.expected}, but got ${actualValue}`,
          }
        }
        break
      case 'contains':
        if (!String(actualValue).includes(String(assertion.expected))) {
          return {
            success: false,
            message: `Expected ${assertion.type} to contain ${assertion.expected}`,
          }
        }
        break
      case 'exists':
        if (actualValue === undefined || actualValue === null) {
          return {
            success: false,
            message: `Expected ${assertion.type} to exist`,
          }
        }
        break
      case 'greaterThan':
        if (typeof actualValue !== 'number' || actualValue <= Number(assertion.expected)) {
          return {
            success: false,
            message: `Expected ${assertion.type} to be greater than ${assertion.expected}, but got ${actualValue}`,
          }
        }
        break
      case 'lessThan':
        if (typeof actualValue !== 'number' || actualValue >= Number(assertion.expected)) {
          return {
            success: false,
            message: `Expected ${assertion.type} to be less than ${assertion.expected}, but got ${actualValue}`,
          }
        }
        break
    }

    return {
      success: true,
      message: `${assertion.type} assertion passed`,
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export async function runTests(
  scripts: TestScript[],
  assertions: TestAssertion[],
  response: Response
): Promise<TestResult> {
  const startTime = performance.now()
  const results: TestResult = {
    scriptId: '',
    success: true,
    assertions: [],
    scriptResults: [],
    duration: 0,
  }

  // Try to parse response body as JSON
  let parsedBody = null
  try {
    parsedBody = JSON.parse(response.body)
  } catch {
    // If parsing fails, leave it as null
  }

  // Run assertions
  for (const assertion of assertions.filter((a) => a.enabled)) {
    const result = evaluateAssertion(assertion, response)
    results.assertions.push({
      id: assertion.id,
      ...result,
    })
    if (!result.success) {
      results.success = false
    }
  }

  // Run scripts
  for (const script of scripts.filter((s) => s.enabled)) {
    try {
      results.scriptId = script.id
      const [context, getTestResults] = createTestContext(response)
      
      // Create the pm object that matches Postman's structure
      const pm = {
        response: {
          code: response.status,
          status: response.status,
          body: parsedBody || response.body,
          headers: response.headers,
          responseTime: response.timing?.duration || 0,
          json: () => parsedBody || JSON.parse(response.body)
        },
        test: context.test,
        expect: context.expect
      }
      
      // Create a function from the script code and execute it with the pm object
      const fn = new Function('pm', script.code)
      await fn(pm)

      // Get the test results and add them to the results
      const scriptResults = getTestResults()
      results.scriptResults.push(...scriptResults)
      
      // Update overall success
      if (scriptResults.some(r => !r.success)) {
        results.success = false
      }
    } catch (error) {
      results.success = false
      results.error = error instanceof Error ? error.message : 'Unknown error'
      break
    }
  }

  results.duration = Math.round(performance.now() - startTime)
  return results
} 