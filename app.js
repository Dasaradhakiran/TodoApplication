const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const format = require("date-fns/format");
const isValid = require("date-fns/isValid");

const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "todoApplication.db");

let db = null;
const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(-1);
  }
};
initializeDbAndServer();

const hasPriorityAndStatusProperty = (requestQuery) => {
  return (
    requestQuery.priority !== undefined && requestQuery.status !== undefined
  );
};
const hasCategoryAndStatusProperty = (requestQuery) => {
  return (
    requestQuery.category !== undefined && requestQuery.status !== undefined
  );
};
const hasCategoryAndPriorityProperty = (requestQuery) => {
  return (
    requestQuery.category !== undefined && requestQuery.priority !== undefined
  );
};
const hasStatusProperty = (requestQuery) => {
  return requestQuery.status !== undefined;
};
const hasPriorityProperty = (requestQuery) => {
  return requestQuery.priority !== undefined;
};
const hasCategoryProperty = (requestQuery) => {
  return requestQuery.category !== undefined;
};

const isStatusValid = (status) => {
  return status === "TO DO" || status === "IN PROGRESS" || status === "DONE";
};
const isPriorityValid = (priority) => {
  return priority === "HIGH" || priority === "MEDIUM" || priority === "LOW";
};
const isCategoryValid = (category) => {
  return category === "WORK" || category === "HOME" || category == "LEARNING";
};
const isDateValid = (date) => {
  const dateArr = date.split("-");
  let year = parseInt(dateArr[0]);
  let month = parseInt(dateArr[1]);
  let day = parseInt(dateArr[2]);
  if (month < 1 || month > 12) {
    return false;
  }
  if (day < 1 || day > 31) {
    return false;
  }
  const getDate = new Date(date);
  day = getDate.getDate();
  month = getDate.getMonth();
  year = getDate.getFullYear();

  return isValid(new Date(year, month, day));
};

const formateDate = (date) => {
  const getDate = new Date(date);
  const day = getDate.getDate();
  const month = getDate.getMonth();
  const year = getDate.getFullYear();

  const result = format(new Date(year, month, day), "yyyy-MM-dd");
  return result;
};

const convertTodoNames = (each_object) => {
  return {
    id: each_object.id,
    todo: each_object.todo,
    priority: each_object.priority,
    status: each_object.status,
    category: each_object.category,
    dueDate: each_object.due_date,
  };
};
app.get("/todos/", async (request, response) => {
  let dataArray = null;
  const { search_q = "", status, priority, category } = request.query;
  let getTodoQuery = "";
  let isValidProperty = true;
  switch (true) {
    case hasPriorityAndStatusProperty(request.query):
      if (isPriorityValid(priority) && isStatusValid(status)) {
        getTodoQuery = `SELECT * FROM todo
                            WHERE todo LIKE '%${search_q}%'
                            AND priority = '${priority}'
                            AND status = '${status}';`;
      } else {
        if (isStatusValid(status)) {
          isValidProperty = false;
          response.status(400);
          response.send("Invalid Todo Priority");
        } else {
          isValidProperty = false;
          response.status(400);
          response.send("Invalid Todo Status");
        }
      }
      break;
    case hasCategoryAndStatusProperty(request.query):
      if (isCategoryValid(category) && isStatusValid(status)) {
        getTodoQuery = `SELECT * FROM todo
                    WHERE todo LIKE '%${search_q}%'
                    AND category = '${category}'
                    AND status = '${status}';`;
      } else {
        if (isCategoryValid(category)) {
          isValidProperty = false;
          response.status(400);
          response.send("Invalid Todo Status");
        } else {
          isValidProperty = false;
          response.status(400);
          response.send("Invalid Todo Category");
        }
      }
      break;
    case hasCategoryAndPriorityProperty(request.query):
      if (isCategoryValid(category) && isPriorityValid(priority)) {
        getTodoQuery = `SELECT * FROM todo
                    WHERE todo LIKE '%${search_q}%'
                    AND category = '${category}'
                    AND priority = '${priority}';`;
      } else {
        if (isCategoryValid(category)) {
          isValidProperty = false;
          response.status(400);
          response.send("Invalid Todo Priority");
        } else {
          isValidProperty = false;
          response.status(400);
          response.send("Invalid Todo Category");
        }
      }
      break;
    case hasStatusProperty(request.query):
      if (isStatusValid(status)) {
        getTodoQuery = `SELECT * FROM todo
                    WHERE todo LIKE '%${search_q}%'
                    AND status = '${status}';`;
      } else {
        isValidProperty = false;
        response.status(400);
        response.send("Invalid Todo Status");
      }
      break;
    case hasPriorityProperty(request.query):
      if (isPriorityValid(priority)) {
        getTodoQuery = `SELECT * FROM todo
                    WHERE todo LIKE '%${search_q}%'
                    AND priority = '${priority}';`;
      } else {
        isValidProperty = false;
        response.status(400);
        response.send("Invalid Todo Priority");
      }
      break;
    case hasCategoryProperty(request.query):
      if (isCategoryValid(category)) {
        getTodoQuery = `SELECT * FROM todo
                    WHERE todo LIKE '%${search_q}%'
                    AND category = '${category}';`;
      } else {
        isValidProperty = false;
        response.status(400);
        response.send("Invalid Todo Category");
      }
      break;
    default:
      getTodoQuery = `SELECT * FROM todo
                    WHERE todo LIKE '%${search_q}%';`;
      break;
  }
  if (isValidProperty) {
    dataArray = await db.all(getTodoQuery);
    response.send(dataArray.map((each_data) => convertTodoNames(each_data)));
  }
});

app.get("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const getTodoQuery = `
        SELECT * 
        FROM
            todo
        WHERE  
            id = '${todoId}';`;
  const todo = await db.get(getTodoQuery);
  response.send(convertTodoNames(todo));
});

app.get("/agenda/", async (request, response) => {
  const { date } = request.query;
  const newDate = formateDate(date);
  if (isDateValid(date)) {
    const getTodosDateQuery = `
            SELECT *
            FROM 
                todo
            WHERE 
                due_date = '${newDate}';`;
    const todoDateArray = await db.all(getTodosDateQuery);
    response.send(todoDateArray.map((eachTodo) => convertTodoNames(eachTodo)));
  } else {
    response.status(400);
    response.send("Invalid Due Date");
  }
});

app.post("/todos/", async (request, response) => {
  const todoDetails = request.body;
  const { id, todo, priority, status, category, dueDate } = todoDetails;
  let isValidQuery = true;
  switch (false) {
    case isPriorityValid(priority):
      isValidQuery = false;
      response.status(400);
      response.send("Invalid Todo Priority");
      break;
    case isStatusValid(status):
      isValidQuery = false;
      response.status(400);
      response.send("Invalid Todo Status");
      break;
    case isCategoryValid(category):
      isValidQuery = false;
      response.status(400);
      response.send("Invalid Todo Category");
      break;
    case isDateValid(dueDate):
      isValidQuery = false;
      response.status(400);
      response.send("Invalid Due Date");
      break;
  }
  if (isValidQuery) {
    const newDate = formateDate(dueDate);
    const addTodoQuery = `
        INSERT INTO
            todo(id,todo,priority,status,category,due_date)
        VALUES (
            '${id}',
            '${todo}',
            '${priority}',
            '${status}',
            '${category}',
            '${newDate}'
            );`;
    await db.run(addTodoQuery);
    response.send("Todo Successfully Added");
  }
});

app.put("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const { status, priority, todo, category, dueDate } = request.body;
  switch (true) {
    case status !== undefined:
      if (isStatusValid(status)) {
        const updateStatus = `
                    UPDATE 
                        todo
                    SET
                        status = '${status}'
                    WHERE 
                        id = '${todoId}';`;
        await db.run(updateStatus);
        response.send("Status Updated");
      } else {
        response.status(400);
        response.send("Invalid Todo Status");
      }
      break;
    case priority !== undefined:
      if (isPriorityValid(priority)) {
        const updateQuery = `
                    UPDATE 
                        todo
                    SET
                        priority = '${priority}'
                    WHERE 
                        id = '${todoId}';`;
        await db.run(updateQuery);
        response.send("Priority Updated");
      } else {
        response.status(400);
        response.send("Invalid Todo Priority");
      }
      break;
    case category !== undefined:
      if (isCategoryValid(category)) {
        const updateQuery = `
                    UPDATE 
                        todo
                    SET
                        category = '${category}'
                    WHERE 
                        id = '${todoId}';`;
        await db.run(updateQuery);
        response.send("Category Updated");
      } else {
        response.status(400);
        response.send("Invalid Todo Category");
      }
      break;
    case dueDate !== undefined:
      if (isDateValid(dueDate)) {
        const newDate = formateDate(dueDate);
        const updateQuery = `
                    UPDATE 
                        todo
                    SET
                        due_date = '${newDate}'
                    WHERE 
                        id = '${todoId}';`;
        await db.run(updateQuery);
        response.send("Due Date Updated");
      } else {
        response.status(400);
        response.send("Invalid Due Date");
      }
      break;
    default:
      const updateQuery = `
                    UPDATE 
                        todo
                    SET
                        todo = '${todo}'
                    WHERE 
                        id = '${todoId}';`;
      await db.run(updateQuery);
      response.send("Todo Updated");
      break;
  }
});

app.delete("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const deleteQuery = `
        DELETE FROM
            todo
        WHERE 
            id = '${todoId}';`;
  await db.run(deleteQuery);
  response.send("Todo Deleted");
});

module.exports = app;
